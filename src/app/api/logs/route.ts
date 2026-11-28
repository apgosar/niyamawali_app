import { NextResponse } from "next/server";
import { getStudent } from "@/lib/auth";
import { getAccess, getDayEntries, getTotals, LogError, saveEntry } from "@/lib/logs";
import { isValidYmd, todayIST } from "@/lib/dates";

/** Entries + totals + who-may-edit for the chosen day (used when the student switches day chips). */
export async function GET(req: Request) {
  const student = await getStudent();
  if (!student) return NextResponse.json({ error: "auth" }, { status: 401 });
  const date = new URL(req.url).searchParams.get("date") ?? todayIST();
  if (!isValidYmd(date)) return NextResponse.json({ error: "bad_date" }, { status: 400 });
  const [entries, totals, access] = await Promise.all([
    getDayEntries(student.id, date),
    getTotals(student.id, date),
    getAccess(student.id),
  ]);
  return NextResponse.json({ entries, totals, access });
}

/** Save one niyam. value = 0 clears it. Rejected (403) when the day is locked. */
export async function POST(req: Request) {
  const student = await getStudent();
  if (!student) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const niyamId = Number(b.niyamId);
  const value = Number(b.value);
  if (!Number.isInteger(niyamId) || !Number.isInteger(value) || typeof b.date !== "string") {
    return NextResponse.json({ error: "bad_value" }, { status: 400 });
  }
  try {
    // optional Sutra / Gatha number (gatha entries); left as saved when the request does not mention them
    const text = (v: unknown) => (typeof v === "string" ? v : "");
    const details = typeof b.sutra === "string" || typeof b.gatha_no === "string" ? { sutra: text(b.sutra), gatha_no: text(b.gatha_no) } : undefined;
    const result = await saveEntry(student.id, b.date, niyamId, value, details);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof LogError) {
      return NextResponse.json({ error: e.code }, { status: e.code === "locked" ? 403 : 400 });
    }
    console.error("saveEntry failed", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
