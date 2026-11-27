import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { query } from "../db";
import { currentDonor } from "../leaderboard";
import { donorLines, joinLines } from "../donor";
import { normalizePhoto } from "../storage";
import sharp from "sharp";

const sql = (f: string) => fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", f), "utf8");

describe("donors without a month", () => {
  it("shows nobody until a donor is added, then the newest one; removing it falls back to the previous", async () => {
    await query("delete from donors");
    expect(await currentDonor()).toBeNull();
    await query("insert into donors (name) values ('First')");
    expect((await currentDonor())?.name).toBe("First");
    await query("insert into donors (name, message_en) values ('Second', 'hello')");
    const now = await currentDonor();
    expect(now?.name).toBe("Second");
    expect(now?.message_en).toBe("hello");
    await query("delete from donors where id = $1", [now!.id]);
    expect((await currentDonor())?.name).toBe("First");
  });

  it("the same donor name can be added twice (no month key to clash on)", async () => {
    await query("delete from donors");
    await query("insert into donors (name) values ('Same')");
    await query("insert into donors (name) values ('Same')");
    expect((await query("select 1 from donors")).length).toBe(2);
  });
});

describe("donor name on three lines", () => {
  it("stores the typed lines and gives them back per language", async () => {
    const en = joinLines(["  Matushri  Maniben Parivar ", "Haste- Shrimati Sarojben", "Gaam- Pundi"]);
    const gu = joinLines(["માતુશ્રી મણીબેન પરિવાર", "", "ગામ : પુનડી"]);
    await query("insert into donors (name, name_gu) values ($1,$2)", [en, gu]);
    const d = (await currentDonor())!;
    expect(donorLines(d, "en")).toEqual(["Matushri Maniben Parivar", "Haste- Shrimati Sarojben", "Gaam- Pundi"]);
    expect(donorLines(d, "gu")).toEqual(["માતુશ્રી મણીબેન પરિવાર", "ગામ : પુનડી"]);
  });
  it("uses the other language when one is missing, and copes with old one-line donors", () => {
    expect(donorLines({ name: "Only English", name_gu: null }, "gu")).toEqual(["Only English"]);
    expect(donorLines({ name: "", name_gu: "ફક્ત ગુજરાતી" }, "en")).toEqual(["ફક્ત ગુજરાતી"]);
  });
});

describe("donor photo", () => {
  const picture = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: "#222222" } }).png().toBuffer();
  it("keeps a family photo's shape (student photos stay small squares)", async () => {
    const wide = await sharp(await normalizePhoto(await picture(851, 750), "donors")).metadata();
    expect([wide.width, wide.height]).toEqual([851, 750]); // not enlarged, not cropped
    const huge = await sharp(await normalizePhoto(await picture(4000, 3000), "donors")).metadata();
    expect([huge.width, huge.height]).toEqual([1600, 1200]);
    const student = await sharp(await normalizePhoto(await picture(851, 750), "students")).metadata();
    expect([student.width, student.height]).toEqual([480, 480]);
  });
});

describe("migration 0006", () => {
  it("adds the Gujarati name lines and can be re-run", async () => {
    const pg = new PGlite("memory://");
    for (const f of ["0001_init.sql", "0005_donors_no_month.sql", "0006_donor_lines.sql", "0006_donor_lines.sql"]) await pg.exec(sql(f));
    await pg.exec("insert into donors (name, name_gu) values ('A', 'અ')");
    expect((await pg.query("select name_gu from donors")).rows).toEqual([{ name_gu: "અ" }]);
  });
});

describe("migration 0005", () => {
  it("keeps monthly donors, newest month stays on top, and can be re-run", async () => {
    const pg = new PGlite("memory://");
    await pg.exec(sql("0001_init.sql"));
    await pg.exec("insert into donors (month, name) values ('2026-09','Old'), ('2026-11','Newest'), ('2026-10','Middle')");
    await pg.exec(sql("0005_donors_no_month.sql"));
    await pg.exec(sql("0005_donors_no_month.sql"));
    await pg.exec("insert into donors (name) values ('No month')"); // month is optional now
    const rows = (await pg.query<{ name: string }>("select name from donors order by created_at desc, id desc")).rows.map((r) => r.name);
    expect(rows[0]).toBe("No month");
    expect(rows.slice(1)).toEqual(["Newest", "Middle", "Old"]);
  });
});
