import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getStudent, hashPin, isValidPin, startStudentSession } from "@/lib/auth";

export async function POST(req: Request) {
  const student = await getStudent();
  if (!student) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { pin } = await req.json().catch(() => ({}));
  if (!isValidPin(pin)) return NextResponse.json({ error: "badPin" }, { status: 400 });
  const rows = await query<{ session_version: number }>(
    `update students set pin_hash = $2, must_change_pin = false, session_version = session_version + 1
      where id = $1 returning session_version`,
    [student.id, await hashPin(pin)],
  );
  // Other devices are signed out; this device gets a fresh session.
  await startStudentSession(student.id, rows[0].session_version);
  return NextResponse.json({ ok: true });
}
