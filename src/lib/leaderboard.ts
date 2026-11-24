import "server-only";
import { query } from "./db";
import { monthRange } from "./dates";

export interface LeaderRow {
  id: string;
  student_code: string;
  first_name: string;
  surname: string;
  photo_key: string;
  sangh: string;
  points: number;
  rank: number;
}

/** Ranking for one month (logs + bonuses). Ties share a rank. */
export async function monthlyLeaderboard(month: string, limit = 100): Promise<LeaderRow[]> {
  const [from, to] = monthRange(month);
  return query<LeaderRow>(
    `with pts as (
        select student_id, sum(p)::int as points from (
          select student_id, points as p from daily_logs where log_date >= $1 and log_date < $2
          union all
          select student_id, points as p from bonus_points where awarded_on >= $1 and awarded_on < $2
        ) x group by student_id
     ), ranked as (
        select s.id, s.student_code, s.first_name, s.surname, s.photo_key, s.sangh, pts.points,
               rank() over (order by pts.points desc)::int as rank
          from pts join students s on s.id = pts.student_id
         where s.active and pts.points > 0
     )
     select * from ranked order by rank, first_name limit $3`,
    [from, to, limit],
  );
}

export async function studentRank(month: string, studentId: string): Promise<LeaderRow | null> {
  const all = await monthlyLeaderboard(month, 100000);
  return all.find((r) => r.id === studentId) ?? null;
}

/** Awards the "Top 10" badge to the finishers of a closed month (idempotent). */
export async function awardTop10(month: string) {
  const rows = await monthlyLeaderboard(month, 1000);
  const top = rows.filter((r) => r.rank <= 10);
  for (const r of top) {
    await query(
      "insert into student_badges (student_id, badge_code, earned_on) values ($1, 'top10', current_date) on conflict do nothing",
      [r.id],
    );
  }
}

/** The donor to show: the most recently added one (no duration; the admin adds and removes donors by hand). */
export async function currentDonor() {
  const rows = await query<{ id: number; name: string; photo_key: string | null; message_gu: string | null; message_en: string | null }>(
    "select id, name, photo_key, message_gu, message_en from donors order by created_at desc, id desc limit 1",
  );
  return rows[0] ?? null;
}
