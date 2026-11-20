import "server-only";
import { one, query } from "./db";
import { addDays, addMonths, ageOn, monthOf, monthRange, todayIST } from "./dates";

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export interface DashboardStats {
  totalStudents: number;
  activeToday: number;
  activeThisMonth: number;
  newThisMonth: number;
  pointsThisMonth: number;
  avgPointsPerActive: number;
  referralsAwarded: number;
  referralsPending: number;
  daily: { date: string; n: number }[];
  registrations: { month: string; n: number }[];
  niyamRates: { id: number; name_en: string; name_gu: string; n: number }[];
  bySangh: { sangh: string; students: number; points: number }[];
}

export async function getDashboard(): Promise<DashboardStats> {
  const today = todayIST();
  const month = monthOf(today);
  const [from, to] = monthRange(month);
  const since = addDays(today, -29);

  const head = await one<Record<string, number>>(
    `select
       (select count(*) from students where active)::int as total,
       (select count(distinct student_id) from daily_logs where log_date = $1)::int as active_today,
       (select count(distinct student_id) from daily_logs where log_date >= $2 and log_date < $3)::int as active_month,
       (select count(*) from students where created_at >= $2::date and created_at < $3::date)::int as new_month,
       (coalesce((select sum(points) from daily_logs where log_date >= $2 and log_date < $3),0) +
        coalesce((select sum(points) from bonus_points where awarded_on >= $2 and awarded_on < $3),0))::int as points_month,
       (select count(*) from referrals where status = 'awarded')::int as ref_awarded,
       (select count(*) from referrals where status = 'pending')::int as ref_pending`,
    [today, from, to],
  );

  const daily = await query<{ date: string; n: number }>(
    `select d::date::text as date, coalesce(c.n, 0)::int as n
       from generate_series($1::date, $2::date, interval '1 day') d
       left join (select log_date, count(distinct student_id)::int as n from daily_logs
                   where log_date >= $1::date group by log_date) c on c.log_date = d::date
      order by d`,
    [since, today],
  );

  const registrations = await query<{ month: string; n: number }>(
    `select to_char(created_at, 'YYYY-MM') as month, count(*)::int as n from students
      where created_at >= $1::date group by 1 order by 1`,
    [`${addMonths(month, -11)}-01`],
  );

  const niyamRates = await query<{ id: number; name_en: string; name_gu: string; n: number }>(
    `select n.id, n.name_en, n.name_gu, count(l.niyam_id)::int as n
       from niyams n left join daily_logs l on l.niyam_id = n.id and l.log_date >= $1::date
      where n.active group by n.id order by n.sort_order`,
    [since],
  );

  const bySangh = await query<{ sangh: string; students: number; points: number }>(
    `select s.sangh, count(distinct s.id)::int as students,
            coalesce(sum(p.points), 0)::int as points
       from students s
       left join (
         select student_id, points from daily_logs where log_date >= $1 and log_date < $2
         union all select student_id, points from bonus_points where awarded_on >= $1 and awarded_on < $2
       ) p on p.student_id = s.id
      where s.active group by s.sangh order by points desc, students desc limit 8`,
    [from, to],
  );

  const activeMonth = head?.active_month ?? 0;
  return {
    totalStudents: head?.total ?? 0,
    activeToday: head?.active_today ?? 0,
    activeThisMonth: activeMonth,
    newThisMonth: head?.new_month ?? 0,
    pointsThisMonth: head?.points_month ?? 0,
    avgPointsPerActive: activeMonth ? Math.round((head?.points_month ?? 0) / activeMonth) : 0,
    referralsAwarded: head?.ref_awarded ?? 0,
    referralsPending: head?.ref_pending ?? 0,
    daily,
    registrations,
    niyamRates,
    bySangh,
  };
}

/* ------------------------------------------------------------------ */
/* Students list with filters                                          */
/* ------------------------------------------------------------------ */

export interface StudentFilters {
  from: string; // YYYY-MM (inclusive)
  to: string; // YYYY-MM (inclusive)
  minPoints?: number;
  maxPoints?: number;
  sangh?: string;
  residence?: string;
  village?: string;
  ageMin?: number;
  ageMax?: number;
  pathshala?: "yes" | "no" | "";
  status?: "active" | "inactive" | "";
  q?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

export interface StudentRow {
  id: string;
  first_name: string;
  surname: string;
  photo_key: string;
  dob: string;
  age: number;
  village: string;
  residence: string;
  sangh: string;
  father_name: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  own_phone: string | null;
  dharmik_abhyas: string;
  pathshala: boolean;
  pathshala_name: string | null;
  active: boolean;
  created_at: string;
  points: number;
  active_days: number;
}

const SORTS: Record<string, string> = {
  name: "lower(s.first_name), lower(s.surname)",
  points: "points",
  age: "s.dob",
  sangh: "lower(s.sangh)",
  residence: "lower(s.residence)",
  joined: "s.created_at",
  days: "active_days",
};

export async function queryStudents(f: StudentFilters, opts: { limit?: number; offset?: number } = {}) {
  const [rangeFrom] = monthRange(f.from);
  const [, rangeTo] = monthRange(f.to < f.from ? f.from : f.to);
  const today = todayIST();

  const params: unknown[] = [rangeFrom, rangeTo];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const where: string[] = [];

  if (f.sangh) where.push(`s.sangh ilike ${p(`%${f.sangh}%`)}`);
  if (f.residence) where.push(`s.residence ilike ${p(`%${f.residence}%`)}`);
  if (f.village) where.push(`s.village ilike ${p(`%${f.village}%`)}`);
  if (f.pathshala === "yes") where.push("s.pathshala");
  if (f.pathshala === "no") where.push("not s.pathshala");
  if (f.status === "active") where.push("s.active");
  if (f.status === "inactive") where.push("not s.active");
  if (f.ageMin !== undefined) where.push(`s.dob <= (${p(today)}::date - make_interval(years => ${p(f.ageMin)}::int))`);
  if (f.ageMax !== undefined) where.push(`s.dob > (${p(today)}::date - make_interval(years => ${p(f.ageMax + 1)}::int))`);
  if (f.q) {
    const like = p(`%${f.q.trim()}%`);
    const digits = f.q.replace(/\D/g, "");
    const phoneLike = digits.length >= 3 ? p(`%${digits}%`) : null;
    where.push(
      `(s.first_name || ' ' || s.surname ilike ${like} or s.referral_code ilike ${like}` +
        (phoneLike ? ` or s.father_phone like ${phoneLike} or s.mother_phone like ${phoneLike} or s.own_phone like ${phoneLike}` : "") +
        ")",
    );
  }
  if (f.minPoints !== undefined) where.push(`coalesce(pts.points,0) >= ${p(f.minPoints)}`);
  if (f.maxPoints !== undefined) where.push(`coalesce(pts.points,0) <= ${p(f.maxPoints)}`);

  const order = `${SORTS[f.sort ?? "points"] ?? SORTS.points} ${f.dir === "asc" ? "asc" : "desc"}, s.created_at`;
  const limit = opts.limit ? `limit ${Number(opts.limit)} offset ${Number(opts.offset ?? 0)}` : "";

  const rows = await query<Omit<StudentRow, "age"> & { total: number }>(
    `with pts as (
        select student_id, sum(points)::int as points from (
          select student_id, points from daily_logs where log_date >= $1 and log_date < $2
          union all select student_id, points from bonus_points where awarded_on >= $1 and awarded_on < $2
        ) x group by student_id
     ), days as (
        select student_id, count(distinct log_date)::int as n from daily_logs
         where log_date >= $1 and log_date < $2 group by student_id
     )
     select s.id, s.first_name, s.surname, s.photo_key, s.dob::text as dob, s.village, s.residence, s.sangh,
            s.father_name, s.father_phone, s.mother_name, s.mother_phone, s.own_phone, s.dharmik_abhyas,
            s.pathshala, s.pathshala_name, s.active, s.created_at::text as created_at,
            coalesce(pts.points, 0)::int as points, coalesce(days.n, 0)::int as active_days,
            count(*) over ()::int as total
       from students s
       left join pts on pts.student_id = s.id
       left join days on days.student_id = s.id
      ${where.length ? "where " + where.join(" and ") : ""}
      order by ${order} ${limit}`,
    params,
  );

  return {
    total: rows[0]?.total ?? 0,
    rows: rows.map((r) => ({ ...r, age: ageOn(r.dob, today) })) as StudentRow[],
  };
}

/** Parses URL search params into filters (shared by the list page and the CSV export). */
export function parseFilters(sp: Record<string, string | string[] | undefined>): StudentFilters {
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const num = (k: string) => {
    const v = get(k);
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const cur = monthOf(todayIST());
  const isMonth = (m?: string) => !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
  const from = isMonth(get("from")) ? get("from")! : cur;
  const to = isMonth(get("to")) ? get("to")! : from;
  return {
    from,
    to: to < from ? from : to,
    minPoints: num("min"),
    maxPoints: num("max"),
    sangh: get("sangh"),
    residence: get("residence"),
    village: get("village"),
    ageMin: num("ageMin"),
    ageMax: num("ageMax"),
    pathshala: (get("pathshala") as "yes" | "no" | undefined) ?? "",
    status: (get("status") as "active" | "inactive" | undefined) ?? "",
    q: get("q"),
    sort: get("sort") ?? "points",
    dir: get("dir") === "asc" ? "asc" : "desc",
  };
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formulas coming from user-typed text.
    const safe = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  // BOM so Excel opens Gujarati text correctly.
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

/* ------------------------------------------------------------------ */
/* Student detail                                                      */
/* ------------------------------------------------------------------ */

export async function getStudentDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const s = await one<Record<string, string | number | boolean | null>>(
    `select s.*, s.dob::text as dob, s.created_at::text as created_at,
            (select first_name || ' ' || surname from students r where r.id = s.referred_by) as referred_by_name
       from students s where s.id = $1`,
    [id],
  );
  if (!s) return null;
  const [months, badges, referrals, bonuses, recent] = await Promise.all([
    query<{ month: string; total: number; days: number }>(
      `select month, sum(p)::int as total, count(distinct d)::int as days from (
          select to_char(log_date,'YYYY-MM') as month, points as p, log_date as d from daily_logs where student_id = $1
          union all select to_char(awarded_on,'YYYY-MM'), points, null from bonus_points where student_id = $1
       ) x group by month order by month desc`,
      [id],
    ),
    query<{ badge_code: string; earned_on: string }>("select badge_code, earned_on::text as earned_on from student_badges where student_id = $1", [id]),
    query<{ first_name: string; surname: string; status: string }>(
      `select s.first_name, s.surname, r.status from referrals r join students s on s.id = r.referee_id where r.referrer_id = $1`, [id]),
    query<{ id: number; awarded_on: string; kind: string; points: number; note: string | null }>(
      "select id, awarded_on::text as awarded_on, kind, points, note from bonus_points where student_id = $1 order by id desc limit 20", [id]),
    query<{ d: string; p: number; c: number }>(
      `select log_date::text as d, sum(points)::int as p, count(*)::int as c from daily_logs
        where student_id = $1 and log_date > $2 group by log_date order by log_date desc`,
      [id, addDays(todayIST(), -30)],
    ),
  ]);
  return { s, months, badges, referrals, bonuses, recent };
}
