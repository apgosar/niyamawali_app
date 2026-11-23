import { NextResponse } from "next/server";
import { one, query } from "@/lib/db";
import { getStudent } from "@/lib/auth";
import { deletePhoto, savePhoto } from "@/lib/storage";
import { MAX_PHOTO_BYTES, parseDetails, type FieldErrors } from "@/lib/validation";

export async function GET() {
  const s = await getStudent();
  if (!s) return NextResponse.json({ error: "auth" }, { status: 401 });
  const d = await one(
    `select village, father_name, father_phone, mother_name, mother_phone, own_phone, residence, sangh,
            dharmik_abhyas, pathshala, pathshala_name, standard, previous_shibirs, gender from students where id = $1`,
    [s.id],
  );
  return NextResponse.json(d);
}

/** Students can update their contact / dharmik details and photo (not name, DOB or PIN). */
export async function POST(req: Request) {
  const s = await getStudent();
  if (!s) return NextResponse.json({ error: "auth" }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "bad" }, { status: 400 });

  const errors: FieldErrors = {};
  const d = parseDetails(fd, errors);
  const g = String(fd.get("gender") ?? "").toUpperCase();
  const gender = g === "M" || g === "F" ? g : null;
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  let newKey: string | null = null;
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ errors: { photo: "photo" } }, { status: 422 });
    try {
      newKey = await savePhoto(Buffer.from(await photo.arrayBuffer()), "students");
    } catch {
      return NextResponse.json({ errors: { photo: "photo" } }, { status: 422 });
    }
  }

  await query(
    `update students set village=$2, father_name=$3, father_phone=$4, mother_name=$5, mother_phone=$6, own_phone=$7,
            residence=$8, sangh=$9, dharmik_abhyas=$10, pathshala=$11, pathshala_name=$12,
            photo_key = coalesce($13, photo_key), standard = $14, previous_shibirs = $15,
            gender = coalesce(gender, $16)  -- gender can be filled in once (never changed), so the Student ID stays correct
      where id = $1`,
    [s.id, d.village, d.father_name, d.father_phone, d.mother_name, d.mother_phone, d.own_phone, d.residence,
     d.sangh, d.dharmik_abhyas, d.pathshala, d.pathshala_name, newKey, d.standard, d.previous_shibirs, gender],
  );
  if (newKey) await deletePhoto(s.photo_key);
  return NextResponse.json({ ok: true });
}
