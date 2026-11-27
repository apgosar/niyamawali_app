/** Pure helpers for the donor's name lines. Safe to use in the browser and on the server. */

export const DONOR_LINES = 3;

/** The typed lines (empty ones dropped) as the single text stored in the database. */
export function joinLines(lines: string[]): string {
  return lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

/** The donor's name lines in the chosen language; falls back to the other language when one is not filled in. */
export function donorLines(donor: { name: string; name_gu: string | null }, lang: "en" | "gu"): string[] {
  const text = (lang === "gu" ? donor.name_gu : donor.name) || donor.name || donor.name_gu || "";
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}
