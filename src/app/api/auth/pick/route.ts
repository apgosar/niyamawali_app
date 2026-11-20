import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { readPickToken, startStudentSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { token, studentId } = await req.json().catch(() => ({}));
  const ids = typeof token === "string" ? await readPickToken(token) : null;
  if (!ids || !ids.includes(studentId)) return NextResponse.json({ error: "expired" }, { status: 400 });
  const s = await one<{ id: string; session_version: number }>(
    "select id, session_version from students where id = $1 and active",
    [studentId],
  );
  if (!s) return NextResponse.json({ error: "expired" }, { status: 400 });
  await startStudentSession(s.id, s.session_version);
  return NextResponse.json({ ok: true });
}
