/** Pure text helpers for village names. Safe to use in the browser and on the server. */

/**
 * Tidies what a student typed: single spaces, no stray edges, sensible capitals.
 * "  kotda   roha " → "Kotda Roha"; "BHUJ" → "Bhuj"; text that is already mixed-case is left as typed.
 */
export function normalizeVillage(input: string): string {
  let v = input.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 60);
  if (/[A-Za-z]/.test(v) && (v === v.toLowerCase() || v === v.toUpperCase())) {
    v = v.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase());
  }
  return v;
}

const key = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

/** Live search: names starting with what was typed first, then names containing it; both in the list's own order. */
export function rankMatches(options: string[], query: string): string[] {
  const q = key(query);
  if (!q) return options;
  const starts: string[] = [];
  const contains: string[] = [];
  for (const o of options) {
    const k = key(o);
    if (k.startsWith(q)) starts.push(o);
    else if (k.includes(q) || k.split(/[\s/]+/).some((w) => w.startsWith(q))) contains.push(o);
  }
  return [...starts, ...contains];
}

/** The list's own spelling for something the student typed, or null when it is not on the list yet. */
export function findExact(options: string[], typed: string): string | null {
  const k = key(typed);
  return k ? (options.find((o) => key(o) === k) ?? null) : null;
}
