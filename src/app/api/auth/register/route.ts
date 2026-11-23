import { NextResponse } from "next/server";
import { one, tx } from "@/lib/db";
import { hashPin, isValidPin, startStudentSession } from "@/lib/auth";
import { generateUniqueCode, findReferrer } from "@/lib/referrals";
import { deletePhoto, savePhoto } from "@/lib/storage";
import { MAX_PHOTO_BYTES, parseDetails, parseIdentity, type FieldErrors } from "@/lib/validation";
import { studentCodeSql } from "@/lib/student-code";

export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "bad" }, { status: 400 });

  const errors: FieldErrors = {};
  const id = parseIdentity(fd, errors);
  const details = parseDetails(fd, errors, { requireStandard: true });
  const pin = fd.get("pin");
  if (!isValidPin(pin)) errors.pin = "pin";

  const photo = fd.get("photo");
  let photoBuf: Buffer | null = null;
  if (!(photo instanceof File) || photo.size === 0) errors.photo = "photo";
  else if (photo.size > MAX_PHOTO_BYTES) errors.photo = "photo";
  else photoBuf = Buffer.from(await photo.arrayBuffer());

  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  // Same child registering twice?
  const dup = await one(
    "select 1 from students where lower(first_name) = lower($1) and lower(surname) = lower($2) and dob = $3",
    [id.first_name, id.surname, id.dob],
  );
  if (dup) return NextResponse.json({ errors: { form: "exists" } }, { status: 409 });

  let photoKey: string;
  try {
    photoKey = await savePhoto(photoBuf!, "students");
  } catch {
    return NextResponse.json({ errors: { photo: "photo" } }, { status: 422 });
  }

  const refCode = typeof fd.get("ref") === "string" ? (fd.get("ref") as string) : "";
  const referrer = refCode ? await findReferrer(refCode) : null;
  const code = await generateUniqueCode();
  const pinHash = await hashPin(pin as string);

  try {
    const created = await tx(async (q) => {
      const rows = await q.query<{ id: string; session_version: number }>(
        `insert into students
           (first_name, surname, photo_key, dob, village, father_name, father_phone, mother_name, mother_phone,
            own_phone, residence, sangh, dharmik_abhyas, pathshala, pathshala_name, pin_hash, referral_code, referred_by,
            gender, standard, previous_shibirs, student_code)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,${studentCodeSql("$19")})
         returning id, session_version`,
        [
          id.first_name, id.surname, photoKey, id.dob, details.village, details.father_name, details.father_phone,
          details.mother_name, details.mother_phone, details.own_phone, details.residence, details.sangh,
          details.dharmik_abhyas, details.pathshala, details.pathshala_name, pinHash, code, referrer?.id ?? null,
          id.gender, details.standard, details.previous_shibirs,
        ],
      );
      if (referrer) {
        await q.query("insert into referrals (referee_id, referrer_id) values ($1, $2)", [rows[0].id, referrer.id]);
      }
      return rows[0];
    });
    await startStudentSession(created.id, created.session_version);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await deletePhoto(photoKey);
    console.error("register failed", e);
    return NextResponse.json({ errors: { form: "server" } }, { status: 500 });
  }
}
