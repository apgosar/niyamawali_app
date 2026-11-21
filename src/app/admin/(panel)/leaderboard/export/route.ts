import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/admin-data";
import { isValidMonth, monthOf, todayIST } from "@/lib/dates";
import { monthlyLeaderboard } from "@/lib/leaderboard";

export async function GET(req: Request) {
  if (!(await getAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const m = new URL(req.url).searchParams.get("month") ?? "";
  const month = isValidMonth(m) ? m : monthOf(todayIST());
  const rows = await monthlyLeaderboard(month, 100000);
  const csv = toCsv([["Rank", "Student ID", "First name", "Surname", "Sangh", "Points"], ...rows.map((r) => [r.rank, r.student_code, r.first_name, r.surname, r.sangh, r.points])]);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leaderboard_${month}.csv"` } });
}
