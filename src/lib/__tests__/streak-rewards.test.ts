import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../db";
import { addDays, todayIST } from "../dates";
import { getNiyams, getTotals, saveEntry, submitDay } from "../logs";
import { computeStreak, streakRescue } from "../streaks";
import { getDashboard, getStudentDetail, parseFilters, queryStudents } from "../admin-data";

const today = todayIST();
const ago = (n: number) => addDays(today, -n);

describe("a streak stays alive while the missing days can still be logged", () => {
  // 19–23 logged, today is the 26th, the edit window covers 24, 25 and 26
  const t = "2026-11-26";
  const window = ["2026-11-26", "2026-11-25", "2026-11-24"];
  const logged = ["2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"];

  it("keeps the count and asks for the oldest missing day", () => {
    expect(computeStreak(logged, t, window)).toBe(5);
    expect(streakRescue(logged, t, window)).toEqual({ date: "2026-11-24", run: 5 });
  });
  it("grows as each day is filled in, then moves on to the next one", () => {
    const with24 = [...logged, "2026-11-24"];
    expect(computeStreak(with24, t, window)).toBe(6);
    expect(streakRescue(with24, t, window)).toEqual({ date: "2026-11-25", run: 6 });
    const with25 = [...with24, "2026-11-25"];
    expect(computeStreak(with25, t, window)).toBe(7);
    expect(streakRescue(with25, t, window)).toBeNull(); // only today is left
  });
  it("breaks once a missing day can no longer be logged", () => {
    expect(computeStreak(logged, "2026-11-27", ["2026-11-27", "2026-11-26", "2026-11-25"])).toBe(0);
    expect(streakRescue(logged, "2026-11-27", ["2026-11-27", "2026-11-26", "2026-11-25"])).toBeNull();
  });
  it("a gap in the middle can still be repaired", () => {
    const gap = [...logged, "2026-11-25"];
    expect(computeStreak(gap, t, window)).toBe(1);
    expect(streakRescue(gap, t, window)).toEqual({ date: "2026-11-24", run: 5 });
  });
});

describe("streak badge and bonus follow the logged days", () => {
  let sid = "";
  let niyam = 0;
  const has7 = async () => (await query("select 1 from student_badges where student_id = $1 and badge_code = 'streak_7'", [sid])).length === 1;
  const bonus7 = async () => (await query("select 1 from bonus_points where student_id = $1 and ref = 'streak:7'", [sid])).length;

  beforeAll(async () => {
    const [r] = await query<{ id: string }>(
      `insert into students (first_name, surname, photo_key, dob, village, mother_name, mother_phone, residence, sangh,
          dharmik_abhyas, pathshala, pin_hash, referral_code)
       values ('Streak','Test','students/x.jpg','2012-01-01','V','M','9820000088','R','S','A',false,'x','STK001') returning id`,
    );
    sid = r.id;
    niyam = (await getNiyams()).niyams.find((n) => n.type === "boolean")!.id;
    for (const back of [7, 6, 5, 4, 3]) // five days, the last one three days ago
      await query("insert into daily_logs (student_id, log_date, niyam_id, value, points) values ($1,$2,$3,1,10)", [sid, ago(back), niyam]);
  });

  it("shows the streak and the day to log", async () => {
    const t = await getTotals(sid, today, today);
    expect(t.streak).toBe(5);
    expect(t.rescue).toEqual({ date: ago(2), run: 5 });
  });

  it("six days is not seven", async () => {
    const r = await saveEntry(sid, ago(2), niyam, 1);
    expect(r.streak).toBe(6);
    expect(r.rescue).toEqual({ date: ago(1), run: 6 });
    expect(r.newBadges).not.toContain("streak_7");
    expect(await has7()).toBe(false);
  });

  it("a tick that is removed again takes the badge and the bonus back", async () => {
    const on = await saveEntry(sid, ago(1), niyam, 1);
    expect(on.newBadges).toContain("streak_7");
    expect(await bonus7()).toBe(1);
    const off = await saveEntry(sid, ago(1), niyam, 0);
    expect(off.streak).toBe(6);
    expect(await has7()).toBe(false);
    expect(await bonus7()).toBe(0);
    expect(off.monthTotal).toBeLessThan(on.monthTotal);
  });

  it("a really completed seventh day earns it once and it stays", async () => {
    await saveEntry(sid, ago(1), niyam, 1);
    await submitDay(sid, ago(1));
    const r = await saveEntry(sid, today, niyam, 1);
    expect(r.streak).toBe(8);
    await saveEntry(sid, today, niyam, 0);
    expect(await has7()).toBe(true);
    expect(await bonus7()).toBe(1);
  });

  it("a wrongly granted badge is cleared on the next save", async () => {
    await query("insert into student_badges (student_id, badge_code, earned_on) values ($1,'streak_21',$2)", [sid, today]);
    await saveEntry(sid, today, niyam, 1);
    expect((await query("select 1 from student_badges where student_id = $1 and badge_code = 'streak_21'", [sid])).length).toBe(0);
  });
});

describe("dates shown to admins are India dates", () => {
  it("a registration just after midnight in India counts on that day and month", async () => {
    // 30 June 20:00 UTC is 1 July 01:30 in India
    const [r] = await query<{ id: string }>(
      `insert into students (first_name, surname, photo_key, dob, village, mother_name, mother_phone, residence, sangh,
          dharmik_abhyas, pathshala, pin_hash, referral_code, created_at)
       values ('Night','Owl','students/x.jpg','2012-01-01','V','M','9820000089','R','S','A',false,'x','IST001','2026-06-30T20:00:00Z') returning id`,
    );
    expect(String((await getStudentDetail(r.id))!.s.created_at)).toMatch(/^2026-07-01 01:30/);
    const { rows } = await queryStudents(parseFilters({ q: "Night" }));
    expect(rows[0].created_at.slice(0, 10)).toBe("2026-07-01");
    expect((await getDashboard()).registrations.find((m) => m.month === "2026-07")?.n).toBe(1);
  });
});
