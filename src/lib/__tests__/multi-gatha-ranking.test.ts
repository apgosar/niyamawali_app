import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { query } from "../db";
import { addDays, todayIST } from "../dates";
import { getBadges, getDayEntries, getNiyams, saveEntry, submitDay } from "../logs";
import { awardTop10, monthlyLeaderboard } from "../leaderboard";
import { saveNiyamEdits } from "../niyams-admin";
import { getMonthEntries } from "../admin-entries";
import { getSettings, saveSettings } from "../settings";

const today = todayIST();
const month = today.slice(0, 7);
let multi = 0, gatha = 0, yesNo = 0;
let rai = 0, devsi = 0; // option ids

async function mkStudent(code: string, shibirs: string): Promise<string> {
  const [{ id }] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, father_name, father_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code, previous_shibirs)
     values ($1,'Test','students/x.jpg','2012-01-01','V','F','9820000001','R','S','A',false,'x',$1,$2) returning id`,
    [code, shibirs],
  );
  return id;
}

beforeAll(async () => {
  const { niyams, options } = await getNiyams();
  multi = niyams.find((n) => n.type === "multi")!.id;
  gatha = niyams.find((n) => n.type === "count")!.id;
  yesNo = niyams.find((n) => n.type === "boolean")!.id;
  rai = options.find((o) => o.code === "rai")!.id;
  devsi = options.find((o) => o.code === "devsi")!.id;
});

describe("Rai / Devsi Pratikraman (multiple choice)", () => {
  it("gives 50 for one, 100 for both, and nothing for unknown ticks", async () => {
    const s = await mkStudent("MULTI1", "deolali");
    expect((await saveEntry(s, today, multi, 1)).dayTotal).toBe(50); // Rai
    expect((await saveEntry(s, today, multi, 2)).dayTotal).toBe(50); // Devsi
    expect((await saveEntry(s, today, multi, 3)).dayTotal).toBe(100); // both
    for (const bad of [4, 7, -1]) await expect(saveEntry(s, today, multi, bad)).rejects.toMatchObject({ code: "bad_value" });
    expect((await saveEntry(s, today, multi, 0)).dayTotal).toBe(0);
  });

  it("shows the ticked names to the admin", async () => {
    const s = await mkStudent("MULTI2", "deolali");
    await saveEntry(s, today, multi, 3);
    const e = await getMonthEntries(s, month);
    expect(e.cells[`${multi}:${today}`]).toMatchObject({ short: "RD", full: "Rai + Devsi", points: 100 });
  });

  it("re-scores past entries from the ticked options when the admin changes points", async () => {
    const s = await mkStudent("MULTI3", "deolali");
    await saveEntry(s, today, multi, 3);
    const edit = (id: number, en: string, points: number) => ({ id, label_gu: en, label_en: en, points, active: true });
    await saveNiyamEdits([], [edit(rai, "Rai", 70), edit(devsi, "Devsi", 50)], true);
    expect((await getDayEntries(s, today))[multi].points).toBe(120);
    await saveNiyamEdits([], [edit(rai, "Rai", 50)], true);
    expect((await getDayEntries(s, today))[multi].points).toBe(100);
  });

  it("is added once, also to a database that already has the 30 niyams", async () => {
    const pg = new PGlite("memory://");
    const dir = path.join(process.cwd(), "supabase", "migrations");
    const migrate = async () => {
      for (const f of fs.readdirSync(dir).sort()) await pg.exec(fs.readFileSync(path.join(dir, f), "utf8"));
      await pg.exec(fs.readFileSync(path.join(process.cwd(), "supabase", "seed.sql"), "utf8"));
    };
    await migrate();
    // as it was before this change: 30 niyams, the old streak bonuses
    await pg.exec("delete from niyams where type = 'multi'");
    await pg.exec("update settings set value = '7:50,21:100,51:200,108:500' where key = 'streak_bonuses'");
    await migrate();
    await migrate();
    const n = (await pg.query<{ sort_order: number }>("select sort_order from niyams where type = 'multi'")).rows;
    expect(n).toEqual([{ sort_order: 31 }]);
    expect((await pg.query("select 1 from niyam_options o join niyams n on n.id = o.niyam_id where n.type = 'multi'")).rows).toHaveLength(2);
    expect((await pg.query("select 1 from niyams")).rows).toHaveLength(31);
    expect((await pg.query<{ value: string }>("select value from settings where key = 'streak_bonuses'")).rows[0].value).toBe("7:50,21:100,54:200,108:500");
  });
});

describe("Sutra and Gatha number", () => {
  it("are optional, kept when only the count changes, cleared with an empty box", async () => {
    const s = await mkStudent("GATHA1", "deolali");
    await saveEntry(s, today, gatha, 1);
    expect((await getDayEntries(s, today))[gatha]).toEqual({ value: 1, points: 20 });
    await saveEntry(s, today, gatha, 1, { sutra: "  Logassa  ", gatha_no: "5-7" });
    await saveEntry(s, today, gatha, 3); // no details sent: unchanged
    expect((await getDayEntries(s, today))[gatha]).toEqual({ value: 3, points: 60, sutra: "Logassa", gatha_no: "5-7" });
    expect((await getMonthEntries(s, month)).cells[`${gatha}:${today}`]).toMatchObject({ sutra: "Logassa", gatha_no: "5-7" });
    await saveEntry(s, today, gatha, 3, { sutra: "", gatha_no: "x".repeat(80) });
    const e = (await getDayEntries(s, today))[gatha];
    expect(e.sutra).toBeUndefined();
    expect(e.gatha_no).toHaveLength(50);
  });

  it("are ignored on other niyams", async () => {
    const s = await mkStudent("GATHA2", "deolali");
    await saveEntry(s, today, yesNo, 1, { sutra: "Logassa", gatha_no: "1" });
    expect((await getDayEntries(s, today))[yesNo]).toEqual({ value: 1, points: 10 });
  });
});

describe("54-day streak", () => {
  it("earns the badge and the bonus at 54 submitted days, not before", async () => {
    await saveSettings({ edit_window_days: "3" });
    expect((await getSettings()).streakBonuses).toContainEqual({ days: 54, points: 200 });
    const s = await mkStudent("STREAK", "deolali");
    // 52 earlier days already submitted, then yesterday and today through the app
    for (let i = 2; i <= 53; i++) {
      const d = addDays(today, -i);
      await query("insert into daily_logs (student_id, log_date, niyam_id, value, points) values ($1,$2,$3,1,10)", [s, d, yesNo]);
      await query("insert into daily_submissions (student_id, log_date) values ($1,$2)", [s, d]);
    }
    await saveEntry(s, addDays(today, -1), yesNo, 1);
    const at53 = await submitDay(s, addDays(today, -1));
    expect(at53.newBadges).not.toContain("streak_54");
    await saveEntry(s, today, yesNo, 1);
    const at54 = await submitDay(s, today);
    expect(at54.newBadges).toContain("streak_54");
    expect(at54.bonuses).toContainEqual({ kind: "streak", points: 200 });
    expect((await getBadges(s)).map((b) => b.badge_code)).toContain("streak_54");
  });
});

describe("ranking", () => {
  it("leaves out students who have not attended a previous Shibir, and gives them no Top 10 badge", async () => {
    const m = "2026-01";
    const yes = await mkStudent("RANKYE", "jogeshwari,deolali");
    const none = await mkStudent("RANKNO", "none");
    const blank = await mkStudent("RANKBL", "");
    for (const [id, pts] of [[yes, 10], [none, 500], [blank, 400]] as const) {
      await query("insert into daily_logs (student_id, log_date, niyam_id, value, points) values ($1,'2026-01-05',$2,1,$3)", [id, yesNo, pts]);
    }
    const rows = await monthlyLeaderboard(m);
    expect(rows.map((r) => [r.student_code && r.first_name, r.rank])).toEqual([["RANKYE", 1]]);
    await awardTop10(m);
    expect((await getBadges(yes)).map((b) => b.badge_code)).toContain("top10");
    expect(await getBadges(none)).toEqual([]);
    expect(await getBadges(blank)).toEqual([]);
  });
});
