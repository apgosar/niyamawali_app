import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { getDayOverview } from "@/lib/admin-entries";
import { toCsv } from "@/lib/admin-data";
import { fmtIST, isValidYmd, todayIST } from "@/lib/dates";

/** Every student's activity on one date. */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const d = new URL(req.url).searchParams.get("date") ?? "";
  const date = isValidYmd(d) ? d : todayIST();
  const { rows } = await getDayOverview(date, { all: true });
  const csv = toCsv([
    ["Date", "Student ID", "First name", "Surname", "Sangh", "Niyams entered", "Points", "Day submitted (IST)", "Last change (IST)"],
    ...rows.map((r) => [date, r.student_code, r.first_name, r.surname, r.sangh, r.count, r.points, r.submitted_at ? fmtIST(r.submitted_at) : "", r.last_update ? fmtIST(r.last_update) : ""]),
  ]);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="daily_${date}.csv"` } });
}
