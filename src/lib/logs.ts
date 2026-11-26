import "server-only";
import { one, query, tx, type Queryable } from "./db";
import { addDays, isValidYmd, monthOf, monthRange, todayIST } from "./dates";
import { scoreEntry, type NiyamDef, type OptionDef } from "./points";
import { computeStreak, longestStreak, streakRescue, type StreakRescue } from "./streaks";
import { getSettings } from "./settings";
import { BADGES } from "./badges";
import { buildAccess, dayAccess, type AccessInfo, type GrantInfo } from "./access";

export async function getNiyams(): Promise<{ niyams: NiyamDef[]; options: OptionDef[] }> {
  const niyams = await query<NiyamDef>(
    `select id, sort_order, name_gu, name_en, type, points, points_per_unit, max_count
       from niyams where active order by sort_order, id`,
  );
  const options = await query<OptionDef>(
    `select id, niyam_id, code, label_gu, label_en, points, sort_order
       from niyam_options where active order by niyam_id, sort_order, id`,
  );
  return { niyams, options };
}

export interface DayEntry {
  value: number;
  points: number;
}

export async function getDayEntries(studentId: string, date: string): Promise<Record<number, DayEntry>> {
  const rows = await query<{ niyam_id: number; value: number; points: number }>(
    "select niyam_id, value, points from daily_logs where student_id = $1 and log_date = $2",
    [studentId, date],
  );
  return Object.fromEntries(rows.map((r) => [r.niyam_id, { value: r.value, points: r.points }]));
}

export interface Totals {
  dayTotal: number;
  monthTotal: number;
  streak: number;
  rescue: StreakRescue | null; // an older empty day that can still be logged to continue the streak
}

export async function getMonthTotal(studentId: string, month: string, q?: Queryable): Promise<number> {
  const [from, to] = monthRange(month);
  const run = q ? q.query.bind(q) : query;
  const r = await run<{ t: number }>(
    `select (
        coalesce((select sum(points) from daily_logs where student_id = $1 and log_date >= $2 and log_date < $3), 0) +
        coalesce((select sum(points) from bonus_points where student_id = $1 and awarded_on >= $2 and awarded_on < $3), 0)
     )::int as t`,
    [studentId, from, to],
  );
  return r[0]?.t ?? 0;
}

/** Every day on which the student has at least one niyam logged. */
async function loggedDates(studentId: string): Promise<string[]> {
  const rows = await query<{ d: string }>("select distinct log_date::text as d from daily_logs where student_id = $1", [studentId]);
  return rows.map((r) => r.d);
}

export async function getStreak(studentId: string, today = todayIST()): Promise<{ streak: number; rescue: StreakRescue | null }> {
  const [dates, access] = await Promise.all([loggedDates(studentId), getAccess(studentId, today)]);
  const fillable = access.days.filter((d) => d.editable).map((d) => d.date);
  return { streak: computeStreak(dates, today, fillable), rescue: streakRescue(dates, today, fillable) };
}

export async function getTotals(studentId: string, date: string, today = todayIST()): Promise<Totals> {
  const [dayRow, monthTotal, streak] = await Promise.all([
    one<{ t: number }>(
      "select coalesce(sum(points),0)::int as t from daily_logs where student_id = $1 and log_date = $2",
      [studentId, date],
    ),
    getMonthTotal(studentId, monthOf(today)),
    getStreak(studentId, today),
  ]);
  return { dayTotal: dayRow?.t ?? 0, monthTotal, ...streak };
}

export class LogError extends Error {
  constructor(public code: "bad_date" | "locked" | "bad_niyam" | "bad_value" | "empty") {
    super(code);
  }
}

/* ---------------- who may edit which day ---------------- */

/** The student's current admin unlock, if any (only one is kept active at a time). */
export async function getActiveGrant(studentId: string): Promise<GrantInfo | null> {
  const g = await one<{ id: number; days_back: number; expires_at: Date | string }>(
    `select id, days_back, expires_at from edit_grants
      where student_id = $1 and revoked_at is null and expires_at > now()
      order by days_back desc, expires_at desc limit 1`,
    [studentId],
  );
  return g ? { id: g.id, days_back: g.days_back, expires_at: new Date(g.expires_at).toISOString() } : null;
}

export async function getAccess(studentId: string, today = todayIST()): Promise<AccessInfo> {
  const [settings, grant, subs] = await Promise.all([
    getSettings(),
    getActiveGrant(studentId),
    query<{ d: string; at: Date | string }>(
      `select log_date::text as d, submitted_at as at from daily_submissions
        where student_id = $1 and log_date > $2`,
      [studentId, addDays(today, -70)],
    ),
  ]);
  return buildAccess(today, settings.editWindowDays, grant, new Map(subs.map((r) => [r.d, new Date(r.at).toISOString()])));
}

export async function getEditState(studentId: string, date: string, today = todayIST()) {
  const [settings, grant, sub] = await Promise.all([
    getSettings(),
    getActiveGrant(studentId),
    one("select 1 from daily_submissions where student_id = $1 and log_date = $2", [studentId, date]),
  ]);
  return { submitted: !!sub, ...dayAccess(date, today, settings.editWindowDays, grant?.days_back ?? null, !!sub) };
}

/** The student finishes a day: from now on only an admin unlock can change it. */
export async function submitDay(studentId: string, date: string): Promise<AccessInfo> {
  if (!isValidYmd(date)) throw new LogError("bad_date");
  const today = todayIST();
  const st = await getEditState(studentId, date, today);
  if (!st.submitted) {
    if (!st.editable) throw new LogError("locked");
    const n = await one<{ n: number }>(
      "select count(*)::int as n from daily_logs where student_id = $1 and log_date = $2",
      [studentId, date],
    );
    if (!n || n.n === 0) throw new LogError("empty");
    await query(
      "insert into daily_submissions (student_id, log_date) values ($1, $2) on conflict do nothing",
      [studentId, date],
    );
  }
  return getAccess(studentId, today);
}

export interface SaveResult extends Totals {
  newBadges: string[];
  bonuses: { kind: string; points: number }[];
}

/**
 * Save (or clear, when value = 0) one niyam for one day, then run the follow-up rules:
 * streak bonuses, referral unlock and badges.
 */
export async function saveEntry(studentId: string, date: string, niyamId: number, value: number): Promise<SaveResult> {
  if (!isValidYmd(date)) throw new LogError("bad_date");
  const today = todayIST();
  const settings = await getSettings();
  if (!(await getEditState(studentId, date, today)).editable) throw new LogError("locked");

  const { niyams, options } = await getNiyams();
  const niyam = niyams.find((n) => n.id === niyamId);
  if (!niyam) throw new LogError("bad_niyam");

  if (value === 0) {
    await query("delete from daily_logs where student_id = $1 and log_date = $2 and niyam_id = $3", [
      studentId,
      date,
      niyamId,
    ]);
  } else {
    const points = scoreEntry(niyam, value, options);
    if (points === null) throw new LogError("bad_value");
    await query(
      `insert into daily_logs (student_id, log_date, niyam_id, value, points)
       values ($1, $2, $3, $4, $5)
       on conflict (student_id, log_date, niyam_id)
       do update set value = excluded.value, points = excluded.points, updated_at = now()`,
      [studentId, date, niyamId, value, points],
    );
  }

  const bonuses: { kind: string; points: number }[] = [];
  const newBadges: string[] = [];

  // streak rewards follow what is really logged: the longest run of days in the student's history
  const best = longestStreak(await loggedDates(studentId));
  await withdrawStreakRewards(studentId, best); // e.g. a tick that completed a streak was removed again

  if (value !== 0) {
    // 1) streak milestone bonuses (each milestone is paid once)
    for (const b of settings.streakBonuses) {
      if (best >= b.days) {
        const ins = await query(
          `insert into bonus_points (student_id, awarded_on, kind, ref, points, note)
           values ($1, $2, 'streak', $3, $4, $5)
           on conflict (student_id, kind, ref) where ref is not null do nothing returning id`,
          [studentId, today, `streak:${b.days}`, b.points, `${b.days}-day streak`],
        );
        if (ins.length) bonuses.push({ kind: "streak", points: b.points });
      }
    }

    // 2) referral bonus – unlocks once the new student has logged on enough days
    const ref = settings.referralsEnabled
      ? await one<{ referrer_id: string }>("select referrer_id from referrals where referee_id = $1 and status = 'pending'", [studentId])
      : null; // programme is off: nothing is paid (pending referrals wait until it is turned back on)
    if (ref) {
      const days = await one<{ n: number }>(
        "select count(distinct log_date)::int as n from daily_logs where student_id = $1",
        [studentId],
      );
      if ((days?.n ?? 0) >= settings.referralUnlockDays) {
        const got = await tx(async (q) => {
          const upd = await q.query(
            `update referrals set status = 'awarded', awarded_at = now()
              where referee_id = $1 and status = 'pending' returning referee_id`,
            [studentId],
          );
          if (!upd.length) return false;
          await q.query(
            `insert into bonus_points (student_id, awarded_on, kind, ref, points, note) values
               ($1, $3, 'referral', 'referred-by', $4, 'Referral bonus (joined through a friend)'),
               ($2, $3, 'referral', $5, $4, 'Referral bonus (a friend you invited is now active)')
             on conflict (student_id, kind, ref) where ref is not null do nothing`,
            [studentId, ref.referrer_id, today, settings.referralBonus, `referral:${studentId}`],
          );
          return true;
        });
        if (got) bonuses.push({ kind: "referral", points: settings.referralBonus });
      }
    }

    // 3) badges
    newBadges.push(...(await evaluateBadges(studentId, date, best, today)));
  }

  return { ...(await getTotals(studentId, date, today)), newBadges, bonuses };
}

const STREAK_BADGES = [{ code: "streak_7", days: 7 }, { code: "streak_21", days: 21 }, { code: "streak_108", days: 108 }];

/** Take back streak badges and streak bonus points whose number of days in a row is no longer there. */
async function withdrawStreakRewards(studentId: string, best: number) {
  for (const b of STREAK_BADGES) {
    if (best < b.days) await query("delete from student_badges where student_id = $1 and badge_code = $2", [studentId, b.code]);
  }
  await query(
    `delete from bonus_points where student_id = $1 and kind = 'streak' and ref like 'streak:%'
       and split_part(ref, ':', 2)::int > $2`,
    [studentId, best],
  );
}

async function evaluateBadges(studentId: string, date: string, best: number, today: string): Promise<string[]> {
  const have = new Set(
    (await query<{ badge_code: string }>("select badge_code from student_badges where student_id = $1", [studentId])).map(
      (r) => r.badge_code,
    ),
  );
  const earned: string[] = [];
  const maybe = async (code: string, test: () => Promise<boolean> | boolean) => {
    if (have.has(code) || !BADGES.some((b) => b.code === code)) return;
    if (await test()) earned.push(code);
  };

  await maybe("first_step", () => true); // a log was just saved
  for (const b of STREAK_BADGES) await maybe(b.code, () => best >= b.days);
  await maybe("perfect_day", async () => {
    const r = await one<{ done: number; total: number }>(
      `select (select count(*) from daily_logs l join niyams n on n.id = l.niyam_id
                where l.student_id = $1 and l.log_date = $2 and n.type = 'boolean' and n.active)::int as done,
              (select count(*) from niyams where type = 'boolean' and active)::int as total`,
      [studentId, date],
    );
    return !!r && r.total > 0 && r.done >= r.total;
  });
  await maybe("tapasvi", async () => {
    const r = await one<{ n: number }>(
      `select count(*)::int as n from daily_logs l
         join niyam_options o on o.id = l.value and o.niyam_id = l.niyam_id
         join niyams n on n.id = l.niyam_id and n.type = 'choice'
        where l.student_id = $1 and o.code in ('ayambil','upvas')`,
      [studentId],
    );
    return (r?.n ?? 0) >= 10;
  });
  await maybe("gyani", async () => {
    const r = await one<{ n: number }>(
      `select coalesce(sum(l.value),0)::int as n from daily_logs l
         join niyams n on n.id = l.niyam_id and n.type = 'count' where l.student_id = $1`,
      [studentId],
    );
    return (r?.n ?? 0) >= 25;
  });
  await maybe("mitra", async () => {
    const r = await one<{ n: number }>(
      "select count(*)::int as n from referrals where referrer_id = $1 and status = 'awarded'",
      [studentId],
    );
    return (r?.n ?? 0) >= 5;
  });

  for (const code of earned) {
    await query(
      "insert into student_badges (student_id, badge_code, earned_on) values ($1, $2, $3) on conflict do nothing",
      [studentId, code, today],
    );
  }
  return earned;
}

export async function getBadges(studentId: string): Promise<{ badge_code: string; earned_on: string }[]> {
  return query("select badge_code, earned_on::text as earned_on from student_badges where student_id = $1", [studentId]);
}

/** Points per day for a month (heat-map on the Progress page). */
export async function getMonthDays(studentId: string, month: string): Promise<Record<string, number>> {
  const [from, to] = monthRange(month);
  const rows = await query<{ d: string; p: number }>(
    `select log_date::text as d, sum(points)::int as p from daily_logs
      where student_id = $1 and log_date >= $2 and log_date < $3 group by log_date`,
    [studentId, from, to],
  );
  return Object.fromEntries(rows.map((r) => [r.d, r.p]));
}

/** Months in which the student has any points, newest first, with totals. */
/** Points per month, split into niyam points (daily logs) and bonus points; total = niyam + bonus. */
export async function getMonthlyTotals(studentId: string): Promise<{ month: string; total: number; niyam: number; bonus: number }[]> {
  return query(
    `select month, sum(n)::int as niyam, sum(b)::int as bonus, sum(n + b)::int as total from (
        select to_char(log_date, 'YYYY-MM') as month, points as n, 0 as b from daily_logs where student_id = $1
        union all
        select to_char(awarded_on, 'YYYY-MM'), 0, points from bonus_points where student_id = $1
     ) x group by month order by month desc`,
    [studentId],
  );
}
