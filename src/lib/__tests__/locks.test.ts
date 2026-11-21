import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../db";
import { addDays, todayIST } from "../dates";
import { buildAccess, dayAccess } from "../access";
import { getAccess, getNiyams, LogError, saveEntry, submitDay } from "../logs";
import { grantEdit, listActiveGrants, revokeGrant, searchStudents } from "../grants";

const today = todayIST();
let yesNo = 0;
let adminId = 0;

async function mkStudent(name: string, code: string): Promise<string> {
  const [{ id }] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, mother_name, mother_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code)
     values ($1,'Lock','students/x.jpg','2012-01-01','V','M','9820000002','R','S','A',false,'x',$2) returning id`,
    [name, code],
  );
  return id;
}

beforeAll(async () => {
  yesNo = (await getNiyams()).niyams.find((n) => n.type === "boolean")!.id;
  const [a] = await query<{ id: number }>(
    "insert into admins (username, name, password_hash) values ('lockadmin','Lock Admin','x') returning id",
  );
  adminId = a.id;
});

describe("dayAccess (pure rules)", () => {
  it("unsubmitted days in the window are editable, submitted ones are not", () => {
    expect(dayAccess("2026-11-20", "2026-11-20", 3, null, false)).toEqual({ editable: true, viaGrant: false });
    expect(dayAccess("2026-11-20", "2026-11-20", 3, null, true)).toEqual({ editable: false, viaGrant: false });
    expect(dayAccess("2026-11-17", "2026-11-20", 3, null, false).editable).toBe(false); // outside window
    expect(dayAccess("2026-11-21", "2026-11-20", 3, 15, false).editable).toBe(false); // future never
  });
  it("an admin unlock reopens submitted and older days, but only inside its range", () => {
    expect(dayAccess("2026-11-20", "2026-11-20", 3, 15, true)).toEqual({ editable: true, viaGrant: true });
    expect(dayAccess("2026-11-06", "2026-11-20", 3, 15, false)).toEqual({ editable: true, viaGrant: true }); // 15th day
    expect(dayAccess("2026-11-05", "2026-11-20", 3, 15, false).editable).toBe(false); // 16th day
    // unlocked but also unsubmitted inside the normal window is just a normal edit
    expect(dayAccess("2026-11-19", "2026-11-20", 3, 15, false)).toEqual({ editable: true, viaGrant: false });
  });
  it("buildAccess lists the window, or the whole unlock range when that is longer", () => {
    const sub = new Map([["2026-11-19", "2026-11-19T10:00:00Z"]]);
    expect(buildAccess("2026-11-20", 3, null, sub).days.map((d) => d.date)).toEqual(["2026-11-20", "2026-11-19", "2026-11-18"]);
    const withGrant = buildAccess("2026-11-20", 3, { id: 1, days_back: 6, expires_at: "x" }, sub);
    expect(withGrant.days).toHaveLength(6);
    expect(withGrant.days[1]).toMatchObject({ date: "2026-11-19", submitted: true, editable: true, viaGrant: true });
  });
});

describe("submit + lock", () => {
  let s = "";
  beforeAll(async () => { s = await mkStudent("Locker", "LOCK01"); });

  it("cannot submit an empty day", async () => {
    await expect(submitDay(s, today)).rejects.toMatchObject({ code: "empty" });
  });

  it("submitting locks the day: no more edits, in any direction", async () => {
    await saveEntry(s, today, yesNo, 1);
    const access = await submitDay(s, today);
    expect(access.days[0]).toMatchObject({ date: today, submitted: true, editable: false });
    await expect(saveEntry(s, today, yesNo, 0)).rejects.toMatchObject({ code: "locked" }); // untick
    await expect(saveEntry(s, today, yesNo, 1)).rejects.toBeInstanceOf(LogError); // even same value
    const left = await query("select 1 from daily_logs where student_id = $1 and log_date = $2", [s, today]);
    expect(left).toHaveLength(1); // untouched
  });

  it("submitting twice is harmless, other days stay editable", async () => {
    await submitDay(s, today);
    await saveEntry(s, addDays(today, -1), yesNo, 1); // yesterday still open
    const a = await getAccess(s);
    expect(a.days.find((d) => d.date === addDays(today, -1))).toMatchObject({ submitted: false, editable: true });
  });

  it("cannot submit a day that is outside the window or in the future", async () => {
    await expect(submitDay(s, addDays(today, -9))).rejects.toMatchObject({ code: "locked" });
    await expect(submitDay(s, addDays(today, 1))).rejects.toMatchObject({ code: "locked" });
  });
});

describe("admin unlock", () => {
  let s = "";
  beforeAll(async () => {
    s = await mkStudent("Boarder", "BORD01");
    await saveEntry(s, today, yesNo, 1);
    await submitDay(s, today);
    // an old day that was never entered (outside the 3-day window)
  });

  it("is locked before any unlock", async () => {
    await expect(saveEntry(s, today, yesNo, 0)).rejects.toMatchObject({ code: "locked" });
    await expect(saveEntry(s, addDays(today, -10), yesNo, 1)).rejects.toMatchObject({ code: "locked" });
  });

  it("an unlock lets the student edit submitted days and the last N days only", async () => {
    await grantEdit({ studentId: s, daysBack: 12, hours: 24, adminId });
    await saveEntry(s, today, yesNo, 0); // a submitted day is editable again
    await saveEntry(s, addDays(today, -10), yesNo, 1); // 11th day back: inside 12 days
    await expect(saveEntry(s, addDays(today, -12), yesNo, 1)).rejects.toMatchObject({ code: "locked" }); // 13th day
    const a = await getAccess(s);
    expect(a.grant?.days_back).toBe(12);
    expect(a.days).toHaveLength(12);
  });

  it("the unlock expires on its own", async () => {
    await query("update edit_grants set expires_at = now() - interval '1 minute' where student_id = $1", [s]);
    await expect(saveEntry(s, addDays(today, -10), yesNo, 0)).rejects.toMatchObject({ code: "locked" });
    expect((await getAccess(s)).grant).toBeNull();
  });

  it("a new unlock replaces the old one, and it can be revoked", async () => {
    await grantEdit({ studentId: s, daysBack: 5, hours: 24, adminId });
    const second = await grantEdit({ studentId: s, daysBack: 20, hours: 48, adminId, note: "parents called" });
    const active = (await listActiveGrants()).filter((g) => g.student_id === s);
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ id: Number(second.id), days_back: 20, note: "parents called", admin_name: "Lock Admin" });
    await revokeGrant(Number(second.id));
    expect((await getAccess(s)).grant).toBeNull();
    await expect(saveEntry(s, addDays(today, -10), yesNo, 1)).rejects.toMatchObject({ code: "locked" });
  });

  it("clamps silly values", async () => {
    const g = await grantEdit({ studentId: s, daysBack: 9999, hours: 9999, adminId });
    expect(g.daysBack).toBe(62);
    expect(g.hours).toBe(720);
    await revokeGrant(Number(g.id));
  });
});

describe("student ID search", () => {
  it("finds a student by ID in any common spelling, by name and by phone", async () => {
    const id = await mkStudent("Searchable", "SRCH01");
    const [{ student_code }] = await query<{ student_code: string }>("select student_code from students where id = $1", [id]);
    expect(student_code).toMatch(/^\d{2}-\d{5}$/);
    const num = student_code.split("-")[1];
    for (const q of [student_code, student_code.replace("-", ""), num, String(Number(num)), "searchab"]) {
      expect((await searchStudents(q)).map((r) => r.id), `query "${q}"`).toContain(id);
    }
    expect((await searchStudents("9820000002")).map((r) => r.id)).toContain(id); // mother's phone
    expect(await searchStudents("zzzzzz")).toEqual([]);
    expect(await searchStudents("   ")).toEqual([]);
  });
});
