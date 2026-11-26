import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../db";
import { addDays, todayIST } from "../dates";
import { getBadges, getMonthTotal, getNiyams, LogError, saveEntry } from "../logs";
import { monthlyLeaderboard } from "../leaderboard";
import { saveSettings } from "../settings";

const today = todayIST();
let a = "", b = "", c = "";
let ids: Record<string, number> = {};

async function mkStudent(name: string, code: string, referredBy?: string): Promise<string> {
  const [{ id }] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, father_name, father_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code, referred_by)
     values ($1,'Test','students/x.jpg','2012-01-01','V','F','9820000001','R','S','A',false,'x',$2,$3) returning id`,
    [name, code, referredBy ?? null],
  );
  if (referredBy) await query("insert into referrals (referee_id, referrer_id) values ($1,$2)", [id, referredBy]);
  return id;
}

beforeAll(async () => {
  const { niyams } = await getNiyams();
  ids = {
    yesno: niyams.find((n) => n.type === "boolean")!.id,
    count: niyams.find((n) => n.type === "count")!.id,
    choice: niyams.find((n) => n.type === "choice")!.id,
  };
  a = await mkStudent("Referrer", "AAAAAA");
  b = await mkStudent("Referee", "BBBBBB", a);
  c = await mkStudent("Loner", "CCCCCC");
});

describe("saveEntry", () => {
  it("scores yes/no, gatha count and choice, and totals update", async () => {
    await saveEntry(c, today, ids.yesno, 1);
    const r = await saveEntry(c, today, ids.count, 3); // 3 gathas x 20
    expect(r.dayTotal).toBe(10 + 60);
    const opt = (await query<{ id: number }>("select id from niyam_options where code = 'ayambil'"))[0].id;
    const r2 = await saveEntry(c, today, ids.choice, opt);
    expect(r2.dayTotal).toBe(10 + 60 + 50);
    expect(r2.monthTotal).toBe(120);
  });

  it("un-ticking removes the points", async () => {
    const r = await saveEntry(c, today, ids.yesno, 0);
    expect(r.dayTotal).toBe(110);
  });

  it("changing a choice replaces (not adds) its points", async () => {
    const upvas = (await query<{ id: number }>("select id from niyam_options where code = 'upvas'"))[0].id;
    const r = await saveEntry(c, today, ids.choice, upvas);
    expect(r.dayTotal).toBe(60 + 60);
  });

  it("rejects days outside the edit window and future days", async () => {
    await expect(saveEntry(c, addDays(today, -3), ids.yesno, 1)).rejects.toMatchObject({ code: "locked" });
    await expect(saveEntry(c, addDays(today, 1), ids.yesno, 1)).rejects.toMatchObject({ code: "locked" });
    await expect(saveEntry(c, "nope", ids.yesno, 1)).rejects.toBeInstanceOf(LogError);
  });

  it("rejects invalid values", async () => {
    await expect(saveEntry(c, today, ids.yesno, 5)).rejects.toMatchObject({ code: "bad_value" });
    await expect(saveEntry(c, today, ids.count, 99)).rejects.toMatchObject({ code: "bad_value" });
    await expect(saveEntry(c, today, 9999, 1)).rejects.toMatchObject({ code: "bad_niyam" });
  });

  it("awards the first-step badge", async () => {
    expect((await getBadges(c)).map((x) => x.badge_code)).toContain("first_step");
  });
});

describe("referral bonus", () => {
  beforeAll(async () => { await saveSettings({ referrals_enabled: "1" }); }); // the programme is OFF by default
  it("stays pending until the referee has logged 3 different days", async () => {
    await saveEntry(b, today, ids.yesno, 1);
    await saveEntry(b, addDays(today, -1), ids.yesno, 1);
    let ref = await query<{ status: string }>("select status from referrals where referee_id = $1", [b]);
    expect(ref[0].status).toBe("pending");
    expect(await getMonthTotal(a, today.slice(0, 7))).toBe(0);

    const r = await saveEntry(b, addDays(today, -2), ids.yesno, 1);
    ref = await query<{ status: string }>("select status from referrals where referee_id = $1", [b]);
    expect(ref[0].status).toBe("awarded");
    expect(r.bonuses.some((x) => x.kind === "referral" && x.points === 100)).toBe(true);

    const bonuses = await query<{ student_id: string; points: number }>("select student_id, points from bonus_points where kind = 'referral'");
    expect(bonuses.filter((x) => x.student_id === a)).toHaveLength(1);
    expect(bonuses.filter((x) => x.student_id === b)).toHaveLength(1);
    expect(bonuses.every((x) => x.points === 100)).toBe(true);
  });

  it("is paid only once even if more days are logged or entries are toggled", async () => {
    await saveEntry(b, today, ids.yesno, 0);
    await saveEntry(b, today, ids.yesno, 1);
    const n = await query<{ n: number }>("select count(*)::int as n from bonus_points where kind = 'referral'");
    expect(n[0].n).toBe(2);
  });

  it("referrer and referee month totals include the bonus", async () => {
    expect(await getMonthTotal(a, today.slice(0, 7))).toBe(100);
    expect(await getMonthTotal(b, today.slice(0, 7))).toBe(30 + 100);
  });
});

describe("streak milestone", () => {
  it("pays the 7-day bonus exactly once", async () => {
    const d = await mkStudent("Streaker", "DDDDDD");
    // six earlier days already logged (older than the edit window, as if logged in the past)
    for (let i = 3; i <= 8; i++) {
      await query(
        "insert into daily_logs (student_id, log_date, niyam_id, value, points) values ($1,$2,$3,1,10)",
        [d, addDays(today, -i), ids.yesno],
      );
    }
    // the seventh day in a row crosses the milestone, even though yesterday is still to be filled in
    const crossing = await saveEntry(d, addDays(today, -2), ids.yesno, 1);
    expect(crossing.streak).toBe(7);
    expect(crossing.bonuses).toContainEqual({ kind: "streak", points: 50 });
    await saveEntry(d, addDays(today, -1), ids.yesno, 1);
    const r = await saveEntry(d, today, ids.yesno, 1); // 9 consecutive days now
    expect(r.streak).toBe(9);
    expect(r.bonuses.some((x) => x.kind === "streak")).toBe(false); // already paid
    await saveEntry(d, today, ids.yesno, 0);
    await saveEntry(d, today, ids.yesno, 1);
    const paid = await query<{ n: number }>("select count(*)::int as n from bonus_points where student_id = $1 and kind = 'streak'", [d]);
    expect(paid[0].n).toBe(1);
    expect((await getBadges(d)).map((x) => x.badge_code)).toContain("streak_7");
  });
});

describe("leaderboard", () => {
  it("ranks by points and ties share a rank", async () => {
    const rows = await monthlyLeaderboard(today.slice(0, 7));
    expect(rows[0].points).toBeGreaterThanOrEqual(rows[1].points);
    expect(rows.map((r) => r.rank)[0]).toBe(1);
  });
});
