import { ageOn, isValidYmd, todayIST } from "./dates";
import { normalizePhone } from "./auth";
import { GENDERS, PREVIOUS_SHIBIRS, STANDARDS, type Gender } from "./profile-options";

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
  standard: number | null;
  /** comma-separated codes, "" = none */
  previous_shibirs: string;
}

const str = (v: FormDataEntryValue | null, max = 150) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** Validates the "details" part shared by registration and profile edit. */
export function parseDetails(fd: FormData, errors: FieldErrors, opts: { requireStandard?: boolean } = {}): StudentDetails {
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

  // current standard (1st – 15th): required when registering, optional when an existing student edits their details
  const stdRaw = str(fd.get("standard"), 3);
  let standard: number | null = null;
  if (stdRaw) {
    const n = Number(stdRaw);
    if (STANDARDS.includes(n)) standard = n;
    else errors.standard = "required";
  } else if (opts.requireStandard) errors.standard = "required";

  // previously attended shibirs: any number of the known options (none is fine)
  const picked = new Set(fd.getAll("previous_shibirs").map((x) => String(x)));
  const previous_shibirs = PREVIOUS_SHIBIRS.map((s) => s.code).filter((c) => picked.has(c)).join(",");

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
    standard,
    previous_shibirs,
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
  const g = str(fd.get("gender"), 1).toUpperCase();
  const gender = (GENDERS as readonly string[]).includes(g) ? (g as Gender) : null;
  if (!gender) errors.gender = "required";
  return { first_name, surname, dob, gender };
}

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
