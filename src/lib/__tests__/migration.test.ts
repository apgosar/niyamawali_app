import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const sql = (f: string) => fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", f), "utf8");

const ins = (pg: PGlite, name: string, createdAt: string) =>
  pg.query(
    `insert into students (first_name, surname, photo_key, dob, village, father_name, father_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code, created_at)
     values ($1,'T','students/x.jpg','2012-01-01','V','F','9820000001','R','S','A',false,'x',$2,$3)`,
    [name, name.toUpperCase().padEnd(6, "X"), createdAt],
  );

describe("0002 migration", () => {
  it("numbers existing students in joining order, continues for new ones, and can be re-run", async () => {
    const pg = new PGlite("memory://");
    await pg.exec(sql("0001_init.sql"));
    // two students that existed BEFORE the migration (joined in different years, inserted out of order)
    await ins(pg, "Second", "2026-11-10T10:00:00+05:30");
    await ins(pg, "First", "2025-12-31T23:30:00+05:30");

    await pg.exec(sql("0002_locks_ids_grants.sql"));
    const before = (await pg.query<{ first_name: string; student_code: string }>(
      "select first_name, student_code from students order by student_code")).rows;
    expect(before).toEqual([
      { first_name: "First", student_code: "25-00001" },
      { first_name: "Second", student_code: "26-00002" },
    ]);

    // a student registering after the migration gets the next number, with no code supplied
    await ins(pg, "Third", new Date().toISOString());
    const third = (await pg.query<{ student_code: string }>("select student_code from students where first_name = 'Third'")).rows[0];
    expect(third.student_code).toMatch(/^\d{2}-00003$/);

    // re-running changes nothing and never reuses numbers
    await pg.exec(sql("0002_locks_ids_grants.sql"));
    await ins(pg, "Fourth", new Date().toISOString());
    const codes = (await pg.query<{ student_code: string }>("select student_code from students order by student_code")).rows.map((r) => r.student_code);
    expect(new Set(codes).size).toBe(4);
    expect(codes.some((c) => c.endsWith("-00004"))).toBe(true);

    // codes are unique
    await expect(pg.query("update students set student_code = '25-00001' where first_name = 'Third'")).rejects.toThrow();
  });
});
