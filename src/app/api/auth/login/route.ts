import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  clearAttempts, isLockedOut, isValidPin, normalizePhone, recordFailedAttempt,
  signPickToken, startStudentSession, verifyPin,
} from "@/lib/auth";

interface Cand { id: string; first_name: string; surname: string; photo_key: string; pin_hash: string; session_version: number }

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  const pin = body.pin;
  if (!phone) return NextResponse.json({ error: "badPhone" }, { status: 400 });
  if (!isValidPin(pin)) return NextResponse.json({ error: "badPin" }, { status: 400 });
  if (await isLockedOut(phone)) return NextResponse.json({ error: "locked" }, { status: 429 });

  const cands = await query<Cand>(
    `select id, first_name, surname, photo_key, pin_hash, session_version from students
      where active and (father_phone = $1 or mother_phone = $1 or own_phone = $1)`,
    [phone],
  );
  if (cands.length === 0) {
    // Counts toward the lockout so the number cannot be probed endlessly.
    await recordFailedAttempt(phone);
    return NextResponse.json({ error: "notRegistered" }, { status: 404 });
  }
  const matches: Cand[] = [];
  for (const c of cands) if (await verifyPin(pin, c.pin_hash)) matches.push(c);

  if (matches.length === 0) {
    await recordFailedAttempt(phone);
    return NextResponse.json({ error: "wrong" }, { status: 401 });
  }
  await clearAttempts(phone);

  if (matches.length === 1) {
    await startStudentSession(matches[0].id, matches[0].session_version);
    return NextResponse.json({ ok: true });
  }
  // Siblings sharing both phone and PIN: let them choose who they are.
  const token = await signPickToken(matches.map((m) => m.id));
  return NextResponse.json({
    pick: matches.map((m) => ({ id: m.id, name: `${m.first_name} ${m.surname}`, photo: m.photo_key })),
    token,
  });
}
