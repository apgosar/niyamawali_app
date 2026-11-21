import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../db";
import { todayIST } from "../dates";
import { getNiyams } from "../logs";
import { addNiyamRow, EditError, saveNiyamEdits, type NiyamEdit, type OptionEdit } from "../niyams-admin";

const today = todayIST();
let student = "";
let yesNo = 0, count = 0, choice = 0;

/** What the page would submit if nothing was touched. */
async function untouched(): Promise<{ n: NiyamEdit[]; o: OptionEdit[] }> {
  const n = await query<NiyamEdit & { type: string }>("select id, sort_order, name_gu, name_en, active, points, points_per_unit, max_count, type from niyams order by id");
  const o = await query<OptionEdit>("select id, label_gu, label_en, points, active from niyam_options order by id");
  return {
    n: n.map((r) => (r.type === "boolean" ? { id: r.id, sort_order: r.sort_order, name_gu: r.name_gu, name_en: r.name_en, active: r.active, points: r.points }
      : r.type === "count" ? { id: r.id, sort_order: r.sort_order, name_gu: r.name_gu, name_en: r.name_en, active: r.active, points_per_unit: r.points_per_unit, max_count: r.max_count }
      : { id: r.id, sort_order: r.sort_order, name_gu: r.name_gu, name_en: r.name_en, active: r.active })),
    o,
  };
}

beforeAll(async () => {
  const { niyams } = await getNiyams();
  yesNo = niyams.find((x) => x.type === "boolean")!.id;
  count = niyams.find((x) => x.type === "count")!.id;
  choice = niyams.find((x) => x.type === "choice")!.id;
  const [s] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, father_name, father_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code)
     values ('Edit','Test','students/x.jpg','2012-01-01','V','F','9820000009','R','S','A',false,'x','EDIT01') returning id`,
  );
  student = s.id;
  const opt = (await query<{ id: number }>("select id from niyam_options where niyam_id = $1 and code = 'ayambil'", [choice]))[0].id;
  for (const [nid, value, points] of [[yesNo, 1, 10], [count, 3, 60], [choice, opt, 50]] as const) {
    await query("insert into daily_logs (student_id, log_date, niyam_id, value, points) values ($1,$2,$3,$4,$5)", [student, today, nid, value, points]);
  }
});

const dayPoints = async (nid: number) =>
  (await query<{ points: number }>("select points from daily_logs where student_id = $1 and niyam_id = $2", [student, nid]))[0].points;

describe("saveNiyamEdits", () => {
  it("saving without touching anything changes nothing", async () => {
    const { n, o } = await untouched();
    expect(await saveNiyamEdits(n, o, true)).toEqual({ changed: 0, rescored: 0 });
  });

  it("saves several niyams at once; new entries use the new points but past entries stay (re-score off)", async () => {
    const { n, o } = await untouched();
    n.find((x) => x.id === yesNo)!.points = 15;
    n.find((x) => x.id === count)!.points_per_unit = 25;
    const other = n.find((x) => x.id !== yesNo && x.id !== count && x.id !== choice)!;
    other.name_en = "  Renamed niyam ";
    const r = await saveNiyamEdits(n, o, false);
    expect(r).toEqual({ changed: 3, rescored: 0 });
    expect((await query<{ points: number; name_en: string }>("select points, name_en from niyams where id = $1", [yesNo]))[0].points).toBe(15);
    expect((await query<{ name_en: string }>("select name_en from niyams where id = $1", [other.id]))[0].name_en).toBe("Renamed niyam"); // trimmed
    expect(await dayPoints(yesNo)).toBe(10); // history untouched
    expect(await dayPoints(count)).toBe(60);
  });

  it("with re-score on, only niyams whose POINTS changed are re-scored", async () => {
    const { n, o } = await untouched();
    n.find((x) => x.id === yesNo)!.points = 20; // changed
    // count niyam's points are unchanged this time, but rename it: must not be re-scored
    n.find((x) => x.id === count)!.name_en = "Gatha (renamed)";
    const r = await saveNiyamEdits(n, o, true);
    expect(r).toEqual({ changed: 2, rescored: 1 });
    expect(await dayPoints(yesNo)).toBe(20); // re-scored to the new points
    expect(await dayPoints(count)).toBe(60); // untouched: still the old 3 x 20 (ppu is 25 now but it was not edited this time)
  });

  it("count niyam: changed points-per-unit re-scores value x points", async () => {
    const { n, o } = await untouched();
    n.find((x) => x.id === count)!.points_per_unit = 30;
    expect(await saveNiyamEdits(n, o, true)).toEqual({ changed: 1, rescored: 1 });
    expect(await dayPoints(count)).toBe(90); // 3 gathas x 30
  });

  it("choice option points re-score the entries that picked that option", async () => {
    const { n, o } = await untouched();
    const opt = (await query<{ id: number }>("select id from niyam_options where niyam_id = $1 and code = 'ayambil'", [choice]))[0].id;
    o.find((x) => x.id === opt)!.points = 55;
    expect(await saveNiyamEdits(n, o, true)).toEqual({ changed: 1, rescored: 1 });
    expect(await dayPoints(choice)).toBe(55);
  });

  it("an invalid value rejects the whole save (nothing is written)", async () => {
    const { n, o } = await untouched();
    n.find((x) => x.id === yesNo)!.points = 99; // a valid change ...
    n[1].name_gu = "   "; // ... and an invalid one
    await expect(saveNiyamEdits(n, o, false)).rejects.toBeInstanceOf(EditError);
    expect((await query<{ points: number }>("select points from niyams where id = $1", [yesNo]))[0].points).toBe(20);
    const bad = await untouched();
    bad.n.find((x) => x.id === yesNo)!.points = -5;
    await expect(saveNiyamEdits(bad.n, bad.o, false)).rejects.toThrow(/0 or more/);
    const bad2 = await untouched();
    bad2.n.find((x) => x.id === count)!.max_count = 0;
    await expect(saveNiyamEdits(bad2.n, bad2.o, false)).rejects.toThrow(/at least 1/);
  });

  it("ignores ids that do not exist", async () => {
    const { n, o } = await untouched();
    n.push({ id: 99999, sort_order: 1, name_gu: "x", name_en: "x", active: true, points: 1 });
    expect((await saveNiyamEdits(n, o, false)).changed).toBe(0);
  });
});

describe("addNiyamRow", () => {
  it("adds at the end with the right type and points", async () => {
    const before = (await query<{ m: number }>("select max(sort_order)::int as m from niyams"))[0].m;
    const no = await addNiyamRow({ name_gu: "", name_en: "New one", type: "count", points: 40 });
    expect(no).toBe(before + 1);
    const row = (await query<{ name_gu: string; type: string; points: number; points_per_unit: number }>("select name_gu, type, points, points_per_unit from niyams where sort_order = $1", [no]))[0];
    expect(row).toEqual({ name_gu: "New one", type: "count", points: 0, points_per_unit: 40 }); // missing Gujarati falls back to English
    await expect(addNiyamRow({ name_gu: " ", name_en: "", type: "boolean", points: 1 })).rejects.toBeInstanceOf(EditError);
  });
});
