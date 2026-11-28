import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { getMonthEntries } from "@/lib/admin-entries";
import { toCsv } from "@/lib/admin-data";
import { fmtIST, isValidMonth, monthOf, todayIST } from "@/lib/dates";

/** Every entry of one student for one month, one row per niyam per day. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const m = new URL(req.url).searchParams.get("month") ?? "";
  const month = isValidMonth(m) ? m : monthOf(todayIST());
  const s = /^[0-9a-f-]{36}$/i.test(id)
    ? await one<{ student_code: string; first_name: string; surname: string }>("select student_code, first_name, surname from students where id = $1", [id])
    : null;
  if (!s) return new NextResponse("Not found", { status: 404 });
  const e = await getMonthEntries(id, month);

  const rows: (string | number | null)[][] = [["Student ID", "Name", "Date", "Niyam no.", "Niyam", "Entered", "Sutra", "Gatha no.", "Points", "Last changed (IST)", "Day submitted (IST)"]];
  for (const d of e.days) {
    for (const n of e.niyams) {
      const c = e.cells[`${n.id}:${d.date}`];
      if (!c) continue;
      const sub = e.daily[d.date]?.submitted_at;
      rows.push([s.student_code, `${s.first_name} ${s.surname}`, d.date, n.no, n.name_en, c.full, c.sutra, c.gatha_no, c.points, fmtIST(c.updated_at), sub ? fmtIST(sub) : ""]);
    }
  }
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="entries_${s.student_code}_${month}.csv"`,
    },
  });
}
