import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../db";
import { todayIST, monthOf } from "../dates";
import { getNiyams, getMonthlyTotals, saveEntry } from "../logs";
import { getStudentDetail } from "../admin-data";

let sid = "";
const month = monthOf(todayIST());

beforeAll(async () => {
  const [r] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, mother_name, mother_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code)
     values ('Split','Test','students/x.jpg','2012-01-01','V','M','9820000077','R','S','A',false,'x','SPL001') returning id`,
  );
  sid = r.id;
  const yesNo = (await getNiyams()).niyams.find((n) => n.type === "boolean")!;
  await saveEntry(sid, todayIST(), yesNo.id, 1);
  await query("insert into bonus_points (student_id, awarded_on, kind, points, note) values ($1, $2, 'manual', 25, 'test')", [sid, todayIST()]);
  await query("insert into bonus_points (student_id, awarded_on, kind, points, note) values ($1, $2, 'manual', -5, 'fix')", [sid, todayIST()]);
});

describe("niyam points vs bonus points", () => {
  it("the student's monthly totals are split, and add up", async () => {
    const row = (await getMonthlyTotals(sid)).find((m) => m.month === month)!;
    expect(row.niyam).toBeGreaterThan(0);
    expect(row.bonus).toBe(20); // 25 - 5
    expect(row.total).toBe(row.niyam + row.bonus);
  });

  it("the admin's student page shows the same split", async () => {
    const detail = await getStudentDetail(sid);
    const row = detail!.months.find((m) => m.month === month)!;
    expect(row.bonus).toBe(20);
    expect(row.total).toBe(row.niyam + row.bonus);
    expect(row.days).toBe(1);
  });
});
