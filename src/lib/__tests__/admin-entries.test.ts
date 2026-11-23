import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../db";
import { getDayOverview, getMonthEntries } from "../admin-entries";

let a = "", b = "";
let yesNo = 0, count = 0, choice = 0, ayambil = 0;

async function mk(first: string, ref: string) {
  const [r] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, mother_name, mother_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code)
     values ($1,'Entry','students/x.jpg','2012-01-01','V','M','9820000055','R','Test Sangh','A',false,'x',$2) returning id`,
    [first, ref],
  );
  return r.id;
}
const log = (sid: string, date: string, niyam: number, value: number, points: number) =>
  query("insert into daily_logs (student_id, log_date, niyam_id, value, points, updated_at) values ($1,$2,$3,$4,$5,$6)",
    [sid, date, niyam, value, points, `${date}T15:30:00Z`]);

beforeAll(async () => {
  yesNo = (await query<{ id: number }>("select id from niyams where type = 'boolean' order by sort_order limit 1"))[0].id;
  count = (await query<{ id: number }>("select id from niyams where type = 'count'"))[0].id;
  choice = (await query<{ id: number }>("select id from niyams where type = 'choice'"))[0].id;
  ayambil = (await query<{ id: number }>("select id from niyam_options where code = 'ayambil'"))[0].id;
  a = await mk("Amit", "ENT001");
  b = await mk("Bela", "ENT002");
  // Amit: 3 Nov — a yes/no, 3 gathas and Ayambil; 4 Nov — just the yes/no; 30 Nov belongs to November too; 1 Dec is another month
  await log(a, "2026-11-03", yesNo, 1, 10);
  await log(a, "2026-11-03", count, 3, 60);
  await log(a, "2026-11-03", choice, ayambil, 50);
  await log(a, "2026-11-04", yesNo, 1, 10);
  await log(a, "2026-11-30", yesNo, 1, 10);
  await log(a, "2026-12-01", yesNo, 1, 10);
  await query("insert into daily_submissions (student_id, log_date, submitted_at) values ($1,'2026-11-03','2026-11-03T16:00:00Z')", [a]);
  await query("insert into bonus_points (student_id, awarded_on, kind, points, note) values ($1,'2026-11-10','manual',25,'well done')", [a]);
  await log(b, "2026-11-03", yesNo, 1, 10);
});

describe("getMonthEntries", () => {
  it("lays out the month like the paper sheet", async () => {
    const e = await getMonthEntries(a, "2026-11");
    expect(e.days).toHaveLength(30);
    expect(e.days[0]).toMatchObject({ date: "2026-11-01", day: 1, dow: 0 });
    expect(e.cells[`${yesNo}:2026-11-03`]).toMatchObject({ short: "✓", full: "Done", points: 10 });
    expect(e.cells[`${count}:2026-11-03`]).toMatchObject({ short: "3", full: "3 gathas", points: 60 });
    expect(e.cells[`${choice}:2026-11-03`]).toMatchObject({ short: "A", full: "Ayambil", points: 50 });
    expect(e.cells[`${yesNo}:2026-12-01`]).toBeUndefined(); // other month
  });

  it("totals, active days, submissions and bonuses", async () => {
    const e = await getMonthEntries(a, "2026-11");
    expect(e.logPoints).toBe(10 + 60 + 50 + 10 + 10);
    expect(e.bonusPoints).toBe(25);
    expect(e.activeDays).toBe(3);
    expect(e.submittedDays).toBe(1);
    expect(e.daily["2026-11-03"]).toMatchObject({ points: 120, count: 3, submitted_at: "2026-11-03T16:00:00Z", last_update: "2026-11-03T15:30:00Z" });
    expect(e.daily["2026-11-04"].submitted_at).toBeNull();
    expect(e.rowTotals[yesNo]).toBe(30);
    expect(e.bonuses).toEqual([expect.objectContaining({ points: 25, note: "well done", kind: "manual" })]);
  });

  it("only shows rows for active niyams or ones that have entries, and never mixes students", async () => {
    await query("update niyams set active = false where id = $1", [count]);
    let e = await getMonthEntries(b, "2026-11"); // Bela never used the (now hidden) gatha niyam
    expect(e.niyams.some((n) => n.id === count)).toBe(false);
    e = await getMonthEntries(a, "2026-11"); // Amit has entries for it, so it stays visible
    expect(e.niyams.find((n) => n.id === count)?.active).toBe(false);
    await query("update niyams set active = true where id = $1", [count]);
    expect(Object.keys((await getMonthEntries(b, "2026-11")).cells)).toEqual([`${yesNo}:2026-11-03`]);
  });

  it("a month with nothing is empty, not an error", async () => {
    const e = await getMonthEntries(b, "2027-02");
    expect(e.days).toHaveLength(28);
    expect(e.activeDays + e.logPoints + e.submittedDays).toBe(0);
  });
});

describe("getDayOverview", () => {
  it("lists who entered what on a date", async () => {
    const d = await getDayOverview("2026-11-03");
    const mine = d.rows.filter((r) => ["Amit", "Bela"].includes(r.first_name));
    expect(mine.map((r) => [r.first_name, r.count, r.points, !!r.submitted_at])).toEqual([["Amit", 3, 120, true], ["Bela", 1, 10, false]]);
    expect(d.withEntries).toBeGreaterThanOrEqual(2);
    expect(d.submitted).toBeGreaterThanOrEqual(1);
  });

  it("hides students with no entries unless asked, and can search", async () => {
    const quiet = await getDayOverview("2026-11-04");
    expect(quiet.rows.map((r) => r.first_name)).toContain("Amit");
    expect(quiet.rows.map((r) => r.first_name)).not.toContain("Bela");
    const all = await getDayOverview("2026-11-04", { all: true });
    expect(all.rows.map((r) => r.first_name)).toContain("Bela");
    const found = await getDayOverview("2026-11-03", { q: "bela" });
    expect(found.rows.map((r) => r.first_name)).toEqual(["Bela"]);
    expect((await getDayOverview("2026-11-03", { q: "test sangh" })).rows.length).toBeGreaterThanOrEqual(2); // by Sangh
  });
});
