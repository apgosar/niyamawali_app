import { ageOn, isValidYmd, todayIST } from "./dates";
import { normalizePhone } from "./auth";

export type FieldErrors = Record<string, string>;

export interface StudentDetails {
  village: string;
  father_name: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  own_phone: string | null;
  residence: string;
  sangh: string;
  dharmik_abhyas: string;
  pathshala: boolean;
  pathshala_name: string | null;
}

const str = (v: FormDataEntryValue | null, max = 150) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** Validates the "details" part shared by registration and profile edit. */
export function parseDetails(fd: FormData, errors: FieldErrors): StudentDetails {
  const village = str(fd.get("village"));
  const residence = str(fd.get("residence"));
  const sangh = str(fd.get("sangh"));
  const dharmik_abhyas = str(fd.get("dharmik_abhyas"), 250);
  if (!village) errors.village = "required";
  if (!residence) errors.residence = "required";
  if (!sangh) errors.sangh = "required";
  if (!dharmik_abhyas) errors.dharmik_abhyas = "required";

  const father_name = str(fd.get("father_name"), 80);
  const mother_name = str(fd.get("mother_name"), 80);
  const fpRaw = str(fd.get("father_phone"), 20);
  const mpRaw = str(fd.get("mother_phone"), 20);
  const opRaw = str(fd.get("own_phone"), 20);
  const father_phone = normalizePhone(fpRaw);
  const mother_phone = normalizePhone(mpRaw);
  const own_phone = normalizePhone(opRaw);
  if (fpRaw && !father_phone) errors.father_phone = "phone";
  if (mpRaw && !mother_phone) errors.mother_phone = "phone";
  if (opRaw && !own_phone) errors.own_phone = "phone";
  const fatherOk = !!father_name && !!father_phone;
  const motherOk = !!mother_name && !!mother_phone;
  if (!fatherOk && !motherOk) {
    errors.parent = "parent";
    // Point at the most useful field.
    if (father_name && !father_phone && !errors.father_phone) errors.father_phone = "required";
    if (mother_name && !mother_phone && !errors.mother_phone) errors.mother_phone = "required";
  }

  const pathshala = str(fd.get("pathshala"), 5) === "yes";
  const pathshala_name = str(fd.get("pathshala_name"));
  if (fd.get("pathshala") !== "yes" && fd.get("pathshala") !== "no") errors.pathshala = "required";
  if (pathshala && !pathshala_name) errors.pathshala_name = "required";

  return {
    village,
    father_name: fatherOk || father_name ? father_name || null : null,
    father_phone: father_phone || null,
    mother_name: mother_name || null,
    mother_phone: mother_phone || null,
    own_phone: own_phone || null,
    residence,
    sangh,
    dharmik_abhyas,
    pathshala,
    pathshala_name: pathshala ? pathshala_name : null,
  };
}

export function parseIdentity(fd: FormData, errors: FieldErrors) {
  const first_name = str(fd.get("first_name"), 60);
  const surname = str(fd.get("surname"), 60);
  const dob = str(fd.get("dob"), 10);
  if (!first_name) errors.first_name = "required";
  else if (/\s/.test(first_name)) errors.first_name = "name";
  if (!surname) errors.surname = "required";
  if (!isValidYmd(dob)) errors.dob = "dob";
  else {
    const age = ageOn(dob, todayIST());
    if (age < 3 || age > 100) errors.dob = "dob";
  }
  return { first_name, surname, dob };
}

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
