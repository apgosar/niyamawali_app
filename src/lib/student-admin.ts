import "server-only";
import { one, query, tx } from "./db";
import { deletePhoto, savePhoto } from "./storage";
import { resolveVillage } from "./villages";
import { resolveSangh } from "./sanghs";
import { NO_SHIBIR } from "./profile-options";
import { MAX_PHOTO_BYTES, parseDetails, parseIdentity, type FieldErrors } from "./validation";

export type StudentUpdate = { ok: true } | { ok: false; errors: FieldErrors };

interface Saved {
  first_name: string;
  surname: string;
  dob: string;
  gender: string | null;
  previous_shibirs: string;
  photo_key: string;
}

/**
 * An admin correcting a student's profile. Unlike the student, the admin may change every profile field,
 * including those a student can only set once (gender, previous Shibirs). The PIN is not part of this.
 */
export async function updateStudentByAdmin(id: string, fd: FormData): Promise<StudentUpdate> {
  const saved = /^[0-9a-f-]{36}$/i.test(id)
    ? await one<Saved>("select first_name, surname, dob::text as dob, gender, previous_shibirs, photo_key from students where id = $1", [id])
    : null;
  if (!saved) return { ok: false, errors: { form: "missing" } };

  const errors: FieldErrors = {};
  const who = parseIdentity(fd, errors);
  const d = parseDetails(fd, errors);
  // students who joined before these questions existed may have no answer: it can stay empty
  if (!who.gender && !saved.gender) delete errors.gender;
  if (!d.previous_shibirs && !saved.previous_shibirs) delete errors.previous_shibirs;

  const upload = fd.get("photo");
  const photo = upload instanceof File && upload.size > 0 ? upload : null;
  if (photo && photo.size > MAX_PHOTO_BYTES) errors.photo = "photo";
  if (Object.keys(errors).length) return { ok: false, errors };

  // the same check as at registration, only when the name or date of birth is being changed
  const renamed = who.first_name.toLowerCase() !== saved.first_name.toLowerCase()
    || who.surname.toLowerCase() !== saved.surname.toLowerCase() || who.dob !== saved.dob;
  if (renamed && await one(
    "select 1 from students where lower(first_name) = lower($1) and lower(surname) = lower($2) and dob = $3 and id <> $4",
    [who.first_name, who.surname, who.dob, id],
  )) return { ok: false, errors: { form: "exists" } };

  let newKey: string | null = null;
  if (photo) {
    try {
      newKey = await savePhoto(Buffer.from(await photo.arrayBuffer()), "students");
    } catch {
      return { ok: false, errors: { photo: "photo" } };
    }
  }

  try {
    await tx(async (q) => {
      const village = await resolveVillage(q, d.village);
      const sangh = await resolveSangh(q, d.sangh);
      await q.query(
        `update students set first_name=$2, surname=$3, dob=$4, gender=$5,
                village=$6, father_name=$7, father_phone=$8, mother_name=$9, mother_phone=$10, own_phone=$11,
                residence=$12, sangh=$13, dharmik_abhyas=$14, pathshala=$15, pathshala_name=$16,
                standard=$17, previous_shibirs=$18, photo_key = coalesce($19, photo_key),
                -- the Student ID shows the gender (26-M-00007): keep the letter right; year and number never change
                student_code = case when $5::text is null then student_code
                                    else regexp_replace(student_code, '-[MF]-', '-' || $5::text || '-') end
          where id = $1`,
        [id, who.first_name, who.surname, who.dob, who.gender ?? saved.gender, village, d.father_name, d.father_phone,
         d.mother_name, d.mother_phone, d.own_phone, d.residence, sangh, d.dharmik_abhyas, d.pathshala, d.pathshala_name,
         d.standard, d.previous_shibirs, newKey],
      );
      // not eligible for ranking → cannot hold the Top 10 badge
      if (d.previous_shibirs === NO_SHIBIR && saved.previous_shibirs !== NO_SHIBIR) {
        await q.query("delete from student_badges where student_id = $1 and badge_code = 'top10'", [id]);
      }
    });
  } catch (e) {
    await deletePhoto(newKey);
    throw e;
  }
  if (newKey) await deletePhoto(saved.photo_key);
  return { ok: true };
}

/** Everything the admin's edit form starts from. */
export async function getStudentForEdit(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await query<Record<string, string | number | boolean | null>>(
    `select first_name, surname, dob::text as dob, gender, village, father_name, father_phone, mother_name, mother_phone,
            own_phone, residence, sangh, standard, dharmik_abhyas, pathshala, pathshala_name, previous_shibirs,
            photo_key, student_code from students where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
