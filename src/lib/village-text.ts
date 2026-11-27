/** Pure text helpers for the searchable name lists (villages, Sanghs). Safe to use in the browser and on the server. */

/**
 * Tidies what a student typed: single spaces, no stray edges, sensible capitals.
 * "  kotda   roha " → "Kotda Roha"; "BHUJ" → "Bhuj"; text that is already mixed-case is left as typed.
 */
function tidyName(input: string, max: number): string {
  let v = input.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, max).trim();
  if (/[A-Za-z]/.test(v) && (v === v.toLowerCase() || v === v.toUpperCase())) {
    v = v.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase());
  }
  return v;
}

export const normalizeVillage = (input: string) => tidyName(input, 60);

/** Sangh names are long, and keep their usual short forms in capitals. */
export const normalizeSangh = (input: string) => tidyName(input, 150).replace(/\b(kvo|kdo|gvc|bb)\b/gi, (w) => w.toUpperCase());

/** Same name, whatever the capitals, spacing, commas or full stops. */
const key = (s: string) => s.normalize("NFC").replace(/[.,]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Looser form used only for searching: doubled letters count once and "chh" / "chch" read as "ch",
 * so "achalgach" finds "Achhalgachha" and "kutchi" finds "Kutchhi" / "Kutcchi".
 */
const loose = (s: string) => key(s).replace(/[()&-]/g, " ").replace(/\s+/g, " ").trim().replace(/([a-z])\1+/g, "$1").replace(/chh/g, "ch").replace(/(?:ch){2,}/g, "ch");

/**
 * Live search, best first (each group in the list's own order):
 * names starting with what was typed, names containing it, then names containing every typed word in any order.
 */
export function rankMatches(options: string[], query: string): string[] {
  const q = loose(query);
  if (!q) return options;
  const words = q.split(/[\s/]+/);
  const starts: string[] = [];
  const contains: string[] = [];
  const allWords: string[] = [];
  for (const o of options) {
    const k = loose(o);
    if (k.startsWith(q)) starts.push(o);
    else if (k.includes(q)) contains.push(o);
    else if (words.every((w) => k.includes(w))) allWords.push(o);
  }
  return [...starts, ...contains, ...allWords];
}

/** The list's own spelling for something the student typed, or null when it is not on the list yet. */
export function findExact(options: string[], typed: string): string | null {
  const k = key(typed);
  return k ? (options.find((o) => key(o) === k) ?? null) : null;
}
