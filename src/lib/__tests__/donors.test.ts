import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { query } from "../db";
import { currentDonor } from "../leaderboard";

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
