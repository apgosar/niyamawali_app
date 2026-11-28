import { NextResponse } from "next/server";
import { one, query } from "@/lib/db";
import { getStudent } from "@/lib/auth";
import { deletePhoto, savePhoto } from "@/lib/storage";
import { resolveVillageNow } from "@/lib/villages";
import { resolveSanghNow } from "@/lib/sanghs";
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

/** Students can update their contact / dharmik details and photo (not name, DOB, PIN or a saved previous-Shibir answer). */
export async function POST(req: Request) {
  const s = await getStudent();
  if (!s) return NextResponse.json({ error: "auth" }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "bad" }, { status: 400 });

  const errors: FieldErrors = {};
  const saved = await one<{ previous_shibirs: string }>("select previous_shibirs from students where id = $1", [s.id]);
  const d = parseDetails(fd, errors, { savedShibirs: saved?.previous_shibirs });
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

  const village = await resolveVillageNow(d.village); // list spelling, or added to the list if new
  const sangh = await resolveSanghNow(d.sangh);
  await query(
    `update students set village=$2, father_name=$3, father_phone=$4, mother_name=$5, mother_phone=$6, own_phone=$7,
            residence=$8, sangh=$9, dharmik_abhyas=$10, pathshala=$11, pathshala_name=$12,
            photo_key = coalesce($13, photo_key), standard = $14,
            previous_shibirs = case when previous_shibirs = '' then $15 else previous_shibirs end,  -- filled in once
            gender = coalesce(gender, $16)  -- gender can be filled in once (never changed), so the Student ID stays correct
      where id = $1`,
    [s.id, village, d.father_name, d.father_phone, d.mother_name, d.mother_phone, d.own_phone, d.residence,
     sangh, d.dharmik_abhyas, d.pathshala, d.pathshala_name, newKey, d.standard, d.previous_shibirs, gender],
  );
  if (newKey) await deletePhoto(s.photo_key);
  return NextResponse.json({ ok: true });
}
