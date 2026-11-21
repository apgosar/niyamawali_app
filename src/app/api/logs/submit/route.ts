import { NextResponse } from "next/server";
import { getStudent } from "@/lib/auth";
import { LogError, submitDay } from "@/lib/logs";

/** The student submits a day. It is locked from now on (an admin unlock is needed to change it). */
export async function POST(req: Request) {
  const student = await getStudent();
  if (!student) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (typeof b.date !== "string") return NextResponse.json({ error: "bad_date" }, { status: 400 });
  try {
    const access = await submitDay(student.id, b.date);
    return NextResponse.json({ ok: true, access });
  } catch (e) {
    if (e instanceof LogError) {
      return NextResponse.json({ error: e.code }, { status: e.code === "locked" ? 403 : 400 });
    }
    console.error("submitDay failed", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
