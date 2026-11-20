// All "days" in the app are calendar days in India (Asia/Kolkata), as plain YYYY-MM-DD strings.
export const TZ = "Asia/Kolkata";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in IST as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  return fmt.format(now);
}

function toUTC(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(ymd: string, n: number): string {
  return new Date(toUTC(ymd) + n * 86400000).toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

export function monthOf(ymd: string): string {
  return ymd.slice(0, 7);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** [from, to) date range covering a month, e.g. 2026-12 → ["2026-12-01", "2027-01-01"]. */
export function monthRange(month: string): [string, string] {
  return [`${month}-01`, `${addMonths(month, 1)}-01`];
}

export function daysInMonth(month: string): number {
  const [from, to] = monthRange(month);
  return diffDays(from, to);
}

/** The dates a student may log, newest first: today and the previous (windowDays - 1) days. */
export function editableDates(today: string, windowDays: number): string[] {
  const n = Math.max(1, windowDays);
  return Array.from({ length: n }, (_, i) => addDays(today, -i));
}

export function isEditable(date: string, today: string, windowDays: number): boolean {
  const back = diffDays(date, today);
  return back >= 0 && back < Math.max(1, windowDays);
}

export function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return new Date(toUTC(s)).toISOString().slice(0, 10) === s;
}

export function isValidMonth(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function ageOn(dob: string, today: string): number {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_GU = ["જાન્યુઆરી","ફેબ્રુઆરી","માર્ચ","એપ્રિલ","મે","જૂન","જુલાઈ","ઑગસ્ટ","સપ્ટેમ્બર","ઑક્ટોબર","નવેમ્બર","ડિસેમ્બર"];

export function monthLabel(month: string, lang: "en" | "gu"): string {
  const [y, m] = month.split("-").map(Number);
  return `${(lang === "gu" ? MONTHS_GU : MONTHS_EN)[m - 1]} ${y}`;
}

const DOW_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DOW_GU = ["રવિ","સોમ","મંગળ","બુધ","ગુરુ","શુક્ર","શનિ"];

export function dayLabel(ymd: string, lang: "en" | "gu") {
  const dow = new Date(toUTC(ymd)).getUTCDay();
  return { dow: (lang === "gu" ? DOW_GU : DOW_EN)[dow], day: Number(ymd.slice(8, 10)) };
}

/** Day of week (0 = Sunday) for a YYYY-MM-DD string. */
export function weekday(ymd: string): number {
  return new Date(toUTC(ymd)).getUTCDay();
}
