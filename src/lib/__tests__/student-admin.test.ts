import { describe, expect, it } from "vitest";
import { one, query } from "../db";
import { updateStudentByAdmin } from "../student-admin";

async function mkStudent(code: string, extra: { gender?: string | null; shibirs?: string } = {}): Promise<string> {
  const [{ id }] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, father_name, father_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code, gender, previous_shibirs, student_code)
     values ($1,'Admintest','students/x.jpg','2012-01-01','Bhuj','F','9820000001','R','Malad Shwetambar Sangh','A',false,'hash',$1,$2,$3,$4)
     returning id`,
    [code, extra.gender === undefined ? "M" : extra.gender, extra.shibirs ?? "deolali", `26-${extra.gender === null ? "" : "M-"}${code}`],
  );
  return id;
}

function form(first: string, extra: Record<string, string | string[]> = {}) {
  const fd = new FormData();
  const all: Record<string, string | string[]> = {
    first_name: first, surname: "Admintest", dob: "2012-01-01", gender: "M", village: "Bhuj", father_name: "F", father_phone: "9820000001",
    residence: "R", sangh: "Malad Shwetambar Sangh", dharmik_abhyas: "A", pathshala: "no", standard: "", previous_shibirs: ["deolali"], ...extra,
  };
  for (const [k, v] of Object.entries(all)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
}

const read = (id: string) => one<Record<string, unknown>>("select *, dob::text as dob_text from students where id = $1", [id]);

describe("admin editing a student", () => {
  it("changes every profile field, including the ones a student sets only once", async () => {
    const id = await mkStudent("ADM1");
    const r = await updateStudentByAdmin(id, form("Newname", {
      surname: "Changed", dob: "2011-05-06", gender: "F", village: "mandvi", mother_name: "M", mother_phone: "98200 00002",
      residence: "Borivali", sangh: "A Brand New Sangh", standard: "7", dharmik_abhyas: "Sutra", pathshala: "yes", pathshala_name: "P",
      previous_shibirs: ["none"],
    }));
    expect(r).toEqual({ ok: true });
    expect(await read(id)).toMatchObject({
      first_name: "Newname", surname: "Changed", dob_text: "2011-05-06", gender: "F", mother_phone: "9820000002", residence: "Borivali",
      sangh: "A Brand New Sangh", standard: 7, pathshala: true, pathshala_name: "P", previous_shibirs: "none",
      student_code: "26-F-ADM1", // only the letter changes
      pin_hash: "hash", photo_key: "students/x.jpg", // untouched
    });
    expect(await query("select 1 from sanghs where name = 'A Brand New Sangh'")).toHaveLength(1);
  });

  it("applies the registration rules and saves nothing when something is wrong", async () => {
    const id = await mkStudent("ADM2");
    await mkStudent("ADM3");
    const bad = await updateStudentByAdmin(id, form("Two Words", { father_phone: "123", previous_shibirs: [], gender: "" }));
    expect(bad).toMatchObject({ ok: false, errors: { first_name: "name", father_phone: "phone", previous_shibirs: "required", gender: "required" } });
    expect(await updateStudentByAdmin(id, form("adm3"))).toEqual({ ok: false, errors: { form: "exists" } });
    expect(await read(id)).toMatchObject({ first_name: "ADM2", father_phone: "9820000001" });
    expect(await updateStudentByAdmin("nope", form("X"))).toEqual({ ok: false, errors: { form: "missing" } });
  });

  it("leaves old students' missing answers empty and their old-style ID as it is", async () => {
    const id = await mkStudent("ADM4", { gender: null, shibirs: "" });
    expect(await updateStudentByAdmin(id, form("ADM4", { gender: "", previous_shibirs: [] }))).toEqual({ ok: true });
    expect(await read(id)).toMatchObject({ gender: null, previous_shibirs: "" });
    expect(await updateStudentByAdmin(id, form("ADM4", { gender: "F" }))).toEqual({ ok: true });
    expect(await read(id)).toMatchObject({ gender: "F", previous_shibirs: "deolali", student_code: "26-ADM4" });
  });

  it("takes the Top 10 badge away when the student is corrected to “None of the above”", async () => {
    const id = await mkStudent("ADM5");
    await query("insert into student_badges (student_id, badge_code, earned_on) values ($1,'top10','2026-02-01'), ($1,'first_day','2026-01-01')", [id]);
    await updateStudentByAdmin(id, form("ADM5", { previous_shibirs: ["jogeshwari"] }));
    expect(await query("select 1 from student_badges where student_id = $1", [id])).toHaveLength(2);
    await updateStudentByAdmin(id, form("ADM5", { previous_shibirs: ["none"] }));
    expect(await query("select badge_code from student_badges where student_id = $1", [id])).toEqual([{ badge_code: "first_day" }]);
  });
});
