import { describe, expect, it } from "vitest";
import { query } from "../db";
import { searchStudents } from "../grants";
import { parseDetails, parseIdentity } from "../validation";
import { standardLabel, ordinal, parseShibirs, shibirLabels, STANDARDS, PREVIOUS_SHIBIRS } from "../profile-options";
import { studentCodeSql } from "../student-code";

const base = (extra: Record<string, string | string[]> = {}) => {
  const fd = new FormData();
  const all: Record<string, string | string[]> = {
    village: "Palitana", mother_name: "Meena", mother_phone: "9820011111", residence: "Borivali", sangh: "Sangh",
    dharmik_abhyas: "2 Pratikraman", pathshala: "no", standard: "8", ...extra,
  };
  for (const [k, v] of Object.entries(all)) (Array.isArray(v) ? v : [v]).forEach((x) => fd.append(k, x));
  return fd;
};

async function register(first: string, gender: "M" | "F", ref: string) {
  const [row] = await query<{ id: string; student_code: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, mother_name, mother_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code, gender, standard, previous_shibirs, student_code)
     values ($1,'Fields','students/x.jpg','2012-01-01','V','M','9820000077','R','S','A',false,'x',$2,$3,9,'deolali',${studentCodeSql("$3")})
     returning id, student_code`,
    [first, ref, gender],
  );
  return row;
}

describe("Student ID with gender", () => {
  it("is year-gender-number and the number keeps counting across genders", async () => {
    const a = await register("Aa", "M", "FLD001");
    const b = await register("Bb", "F", "FLD002");
    expect(a.student_code).toMatch(/^\d{2}-M-\d{5}$/);
    expect(b.student_code).toMatch(/^\d{2}-F-\d{5}$/);
    const num = (c: string) => Number(c.split("-")[2]);
    expect(num(b.student_code)).toBe(num(a.student_code) + 1);
    // a student with no gender (older style) still gets an ID from the same counter
    const [old] = await query<{ student_code: string }>(
      `insert into students (first_name, surname, photo_key, dob, village, mother_name, mother_phone, residence, sangh, dharmik_abhyas, pathshala, pin_hash, referral_code)
       values ('Old','Style','students/x.jpg','2012-01-01','V','M','9820000078','R','S','A',false,'x','FLD003') returning student_code`);
    expect(old.student_code).toMatch(/^\d{2}-\d{5}$/);
    expect(Number(old.student_code.split("-")[1])).toBe(num(b.student_code) + 1);
  });

  it("only M or F, and the standard must be 1-15", async () => {
    await expect(query("update students set gender = 'X' where first_name = 'Aa'")).rejects.toThrow();
    await expect(query("update students set standard = 16 where first_name = 'Aa'")).rejects.toThrow();
    await expect(query("update students set standard = 0 where first_name = 'Aa'")).rejects.toThrow();
    await query("update students set standard = 15 where first_name = 'Aa'");
  });

  it("can be found by the ID in any spelling (with / without the gender letter, number only)", async () => {
    const [{ id, student_code }] = await query<{ id: string; student_code: string }>("select id, student_code from students where first_name = 'Bb'");
    const [yy, g, n] = student_code.split("-");
    const tries = [student_code, student_code.toLowerCase(), `${yy}${g}${n}`, `${yy}-${n}`, `${yy}${n}`, n, String(Number(n))];
    for (const q of tries) expect((await searchStudents(q)).map((r) => r.id), `query "${q}"`).toContain(id);
    // the other gender with the same year+number does not exist, and a wrong number finds nothing
    expect((await searchStudents(`${yy}-${String(Number(n) + 500).padStart(5, "0")}`)).map((r) => r.id)).not.toContain(id);
  });
});

describe("registration field parsing", () => {
  it("requires gender at registration and accepts only M or F", () => {
    const errs: Record<string, string> = {};
    const fd = new FormData(); fd.set("first_name", "Raj"); fd.set("surname", "Shah"); fd.set("dob", "2012-05-14");
    expect(parseIdentity(fd, errs).gender).toBeNull();
    expect(errs.gender).toBe("required");
    for (const [input, expected] of [["M", "M"], ["f", "F"], ["X", null], ["", null]] as const) {
      const e: Record<string, string> = {}; const f2 = new FormData(); f2.set("first_name", "Raj"); f2.set("surname", "Shah"); f2.set("dob", "2012-05-14"); f2.set("gender", input);
      expect(parseIdentity(f2, e).gender, input).toBe(expected);
      expect(!!e.gender).toBe(expected === null);
    }
  });

  it("standard 1-15 is required when registering, optional when editing", () => {
    let e: Record<string, string> = {};
    expect(parseDetails(base({ standard: "" }), e, { requireStandard: true }).standard).toBeNull();
    expect(e.standard).toBe("required");
    e = {}; expect(parseDetails(base({ standard: "" }), e).standard).toBeNull(); expect(e.standard).toBeUndefined();
    for (const bad of ["0", "16", "abc", "-3"]) { e = {}; parseDetails(base({ standard: bad }), e, { requireStandard: true }); expect(e.standard, bad).toBe("required"); }
    for (const n of [1, 9, 15]) { e = {}; expect(parseDetails(base({ standard: String(n) }), e, { requireStandard: true }).standard).toBe(n); expect(e.standard).toBeUndefined(); }
  });

  it("previous shibirs: any combination, none allowed, unknown values dropped, stable order", () => {
    const e: Record<string, string> = {};
    expect(parseDetails(base({ previous_shibirs: [] }), e).previous_shibirs).toBe("");
    expect(parseDetails(base({ previous_shibirs: ["kutch-pundi", "jogeshwari"] }), e).previous_shibirs).toBe("jogeshwari,kutch-pundi");
    expect(parseDetails(base({ previous_shibirs: ["deolali", "deolali", "bogus"] }), e).previous_shibirs).toBe("deolali");
    expect(Object.keys(e)).toEqual([]);
  });
});

describe("option helpers", () => {
  it("labels", () => {
    expect(STANDARDS).toHaveLength(15);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 15].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "15th"]);
    expect(standardLabel(7, "en")).toBe("7th standard");
    expect(standardLabel(7, "gu")).toBe("ધોરણ 7");
    expect(PREVIOUS_SHIBIRS.map((s) => s.label)).toEqual(["Jogeshwari", "Deolali", "Kutch - Don", "Kutch - Pundi"]);
    expect(parseShibirs("kutch-don,deolali,nope")).toEqual(["deolali", "kutch-don"]);
    expect(shibirLabels("")).toEqual([]);
    expect(shibirLabels("deolali,kutch-pundi")).toEqual(["Deolali", "Kutch - Pundi"]);
  });
});
