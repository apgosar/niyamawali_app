import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { parseFilters, queryStudents, toCsv } from "@/lib/admin-data";

export async function GET(req: Request) {
  if (!(await getAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseFilters(sp);
  const { rows } = await queryStudents(f);
  const csv = toCsv([
    ["Student ID", "First name", "Surname", "Age", "DOB", "Village", "Residence", "Sangh", "Dharmik abhyas", "Pathshala", "Pathshala name",
     "Father", "Father phone", "Mother", "Mother phone", "Own phone", "Joined", "Active days", `Points ${f.from}..${f.to}`, "Status"],
    ...rows.map((r) => [r.student_code, r.first_name, r.surname, r.age, r.dob, r.village, r.residence, r.sangh, r.dharmik_abhyas,
      r.pathshala ? "Yes" : "No", r.pathshala_name, r.father_name, r.father_phone, r.mother_name, r.mother_phone,
      r.own_phone, r.created_at.slice(0, 10), r.active_days, r.points, r.active ? "Active" : "Deactivated"]),
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students_${f.from}_${f.to}.csv"`,
    },
  });
}
