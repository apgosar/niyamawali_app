/** Choices used by the registration form, the profile and the admin screens. Safe to import anywhere. */

export const GENDERS = ["M", "F"] as const;
export type Gender = (typeof GENDERS)[number];

export const PREVIOUS_SHIBIRS = [
  { code: "jogeshwari", label: "Jogeshwari" },
  { code: "deolali", label: "Deolali" },
  { code: "kutch-don", label: "Kutch - Don" },
  { code: "kutch-pundi", label: "Kutch - Pundi" },
] as const;

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
export const shibirLabels = (raw: string | null | undefined) => parseShibirs(raw).map(shibirLabel);
