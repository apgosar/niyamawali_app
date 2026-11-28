/** Choices used by the registration form, the profile and the admin screens. Safe to import anywhere. */

export const GENDERS = ["M", "F"] as const;
export type Gender = (typeof GENDERS)[number];

export const PREVIOUS_SHIBIRS = [
  { code: "jogeshwari", label: "Jogeshwari" },
  { code: "deolali", label: "Deolali" },
  { code: "kutch-don", label: "Kutch - Don" },
  { code: "kutch-pundi", label: "Kutch - Pundi" },
] as const;

/** Stored (and ticked) when a student has not attended any of the Shibirs above: "None of the above". */
export const NO_SHIBIR = "none";

/** 1st … 15th standard */
export const STANDARDS = Array.from({ length: 15 }, (_, i) => i + 1);

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
}

export const standardLabel = (n: number, lang: "en" | "gu") => (lang === "gu" ? `ધોરણ ${n}` : `${ordinal(n)} standard`);

/** "jogeshwari,deolali" → ["jogeshwari", "deolali"] (only known codes, no duplicates, stable order) */
export function parseShibirs(raw: string | null | undefined): string[] {
  const set = new Set((raw ?? "").split(",").map((s) => s.trim()));
  return PREVIOUS_SHIBIRS.map((s) => s.code).filter((c) => set.has(c));
}

export const shibirLabel = (code: string) => PREVIOUS_SHIBIRS.find((s) => s.code === code)?.label ?? code;
export const shibirLabels = (raw: string | null | undefined) =>
  raw === NO_SHIBIR ? ["None of the above"] : parseShibirs(raw).map(shibirLabel);

/** The choices to show as ticked in the form for a stored value. */
export const shibirSelection = (raw: string | null | undefined): string[] => (raw === NO_SHIBIR ? [NO_SHIBIR] : parseShibirs(raw));

/** After a tap in the dropdown: "None of the above" and the Shibirs exclude each other. */
export function pickShibirs(before: string[], after: string[]): string[] {
  const addedNone = after.includes(NO_SHIBIR) && !before.includes(NO_SHIBIR);
  return addedNone ? [NO_SHIBIR] : after.length > 1 ? after.filter((c) => c !== NO_SHIBIR) : after;
}
