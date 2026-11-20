import { NextResponse } from "next/server";
import { endStudentSession } from "@/lib/auth";

export async function POST() {
  await endStudentSession();
  return NextResponse.json({ ok: true });
}
