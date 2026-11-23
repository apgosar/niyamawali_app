import "server-only";
import { query } from "./db";
import { daysInMonth, addDays, monthRange, weekday } from "./dates";

/** timestamptz → "2026-11-21T05:55:12Z" (parses the same in every browser) */
const iso = (col: string) => `to_char(${col} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export interface EntryCell {
  value: number;
  points: number;
  updated_at: string;
  /** short text for the grid: ✓, the gatha count, or the first letter of the choice */
  short: string;
  /** full text: "Done", "3 gathas", "Ayambil" */
  full: string;
}

export interface MonthEntries {
  days: { date: string; day: number; dow: number }[];
  niyams: { id: number; no: number; name_en: string; name_gu: string; type: string; active: boolean }[];
  /** key: `${niyamId}:${date}` */
  cells: Record<string, EntryCell>;
  daily: Record<string, { points: number; count: number; submitted_at: string | null; last_update: string | null }>;
  rowTotals: Record<number, number>;
  bonuses: { id: number; date: string; kind: string; points: number; note: string | null }[];
  logPoints: number;
  bonusPoints: number;
  activeDays: number;
  submittedDays: number;
}

/** Everything one student entered in one month, laid out like the paper sheet. */
export async function getMonthEntries(studentId: string, month: string): Promise<MonthEntries> {
  const [from, to] = monthRange(month);
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = addDays(from, i);
    return { date, day: i + 1, dow: weekday(date) };
  });

  const niyamRows = await query<{ id: number; sort_order: number; name_en: string; name_gu: string; type: string; active: boolean }>(
    "select id, sort_order, name_en, name_gu, type, active from niyams order by sort_order, id",
  );
  const options = new Map(
    (await query<{ id: number; label_en: string }>("select id, label_en from niyam_options")).map((o) => [o.id, o.label_en]),
  );
  const logs = await query<{ niyam_id: number; d: string; value: number; points: number; updated_at: string }>(
    `select niyam_id, log_date::text as d, value, points, ${iso("updated_at")} as updated_at
       from daily_logs where student_id = $1 and log_date >= $2 and log_date < $3`,
    [studentId, from, to],
  );
  const subs = await query<{ d: string; at: string }>(
    `select log_date::text as d, ${iso("submitted_at")} as at from daily_submissions
      where student_id = $1 and log_date >= $2 and log_date < $3`,
    [studentId, from, to],
  );
  const bonuses = await query<{ id: number; date: string; kind: string; points: number; note: string | null }>(
    `select id, awarded_on::text as date, kind, points, note from bonus_points
      where student_id = $1 and awarded_on >= $2 and awarded_on < $3 order by awarded_on, id`,
    [studentId, from, to],
  );

  const typeOf = new Map(niyamRows.map((n) => [n.id, n.type]));
  const cells: MonthEntries["cells"] = {};
  const daily: MonthEntries["daily"] = {};
  const rowTotals: Record<number, number> = {};
  const subMap = new Map(subs.map((s) => [s.d, s.at]));

  for (const l of logs) {
    const type = typeOf.get(l.niyam_id);
    const short = type === "count" ? String(l.value) : type === "choice" ? (options.get(l.value) ?? "?").charAt(0).toUpperCase() : "✓";
    const full = type === "count" ? `${l.value} ${l.value === 1 ? "gatha" : "gathas"}` : type === "choice" ? (options.get(l.value) ?? "?") : "Done";
    cells[`${l.niyam_id}:${l.d}`] = { value: l.value, points: l.points, updated_at: l.updated_at, short, full };
    const d = (daily[l.d] ??= { points: 0, count: 0, submitted_at: subMap.get(l.d) ?? null, last_update: null });
    d.points += l.points;
    d.count += 1;
    if (!d.last_update || l.updated_at > d.last_update) d.last_update = l.updated_at;
    rowTotals[l.niyam_id] = (rowTotals[l.niyam_id] ?? 0) + l.points;
  }
  // a submitted day with no entries left (e.g. unticked after an unlock) still shows its lock
  for (const [d, at] of subMap) daily[d] ??= { points: 0, count: 0, submitted_at: at, last_update: null };

  const shown = niyamRows
    .filter((n) => n.active || rowTotals[n.id] !== undefined)
    .map((n) => ({ id: n.id, no: n.sort_order, name_en: n.name_en, name_gu: n.name_gu, type: n.type, active: n.active }));

  return {
    days,
    niyams: shown,
    cells,
    daily,
    rowTotals,
    bonuses,
    logPoints: logs.reduce((s, l) => s + l.points, 0),
    bonusPoints: bonuses.reduce((s, b) => s + b.points, 0),
    activeDays: Object.values(daily).filter((d) => d.count > 0).length,
    submittedDays: subs.length,
  };
}

export interface DayRow {
  id: string;
  student_code: string;
  first_name: string;
  surname: string;
  photo_key: string;
  sangh: string;
  active: boolean;
  count: number;
  points: number;
  last_update: string | null;
  submitted_at: string | null;
}

/** Every student's activity on one date. */
export async function getDayOverview(date: string, opts: { q?: string; all?: boolean } = {}) {
  const params: unknown[] = [date];
  let where = "";
  if (opts.q?.trim()) {
    params.push(`%${opts.q.trim()}%`);
    where = `where (s.first_name || ' ' || s.surname ilike $2 or s.student_code ilike $2 or s.sangh ilike $2)`;
  }
  const rows = await query<DayRow>(
    `select s.id, s.student_code, s.first_name, s.surname, s.photo_key, s.sangh, s.active,
            coalesce(d.n, 0)::int as count, coalesce(d.p, 0)::int as points,
            ${iso("d.last")} as last_update, ${iso("sub.submitted_at")} as submitted_at
       from students s
       left join (select student_id, count(*) as n, sum(points) as p, max(updated_at) as last
                    from daily_logs where log_date = $1 group by student_id) d on d.student_id = s.id
       left join daily_submissions sub on sub.student_id = s.id and sub.log_date = $1
       ${where}
      order by s.student_code`,
    params,
  );
  return {
    rows: opts.all ? rows : rows.filter((r) => r.count > 0 || r.submitted_at),
    total: rows.length,
    withEntries: rows.filter((r) => r.count > 0).length,
    submitted: rows.filter((r) => r.submitted_at).length,
  };
}
