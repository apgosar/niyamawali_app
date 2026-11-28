import "server-only";
import { addDays, daysInMonth, isValidMonth, monthLabel, monthRange, weekday } from "./dates";
import { getNiyams } from "./logs";
import type { Lang } from "@/i18n";

export type SheetPart = "full" | "first" | "second";

export interface SheetDay {
  date: string;
  day: number; // 1..31
  dow: number; // 0 = Sunday
}

export interface SheetRow {
  no: number;
  name: string;
  points: string; // "10", "20×", "30–60"
  kind: "boolean" | "count" | "choice" | "multi";
}

export interface SheetData {
  lang: Lang;
  month: string;
  monthText: string;
  part: SheetPart;
  days: SheetDay[];
  rows: SheetRow[];
  /** e.g. "B = Biyasana · E = Ekasana · … · R = Rai · D = Devsi" (empty when there is no choice niyam) */
  choiceLegend: string;
  hasCount: boolean;
}

export const parsePart = (v: string | undefined): SheetPart => (v === "first" || v === "second" ? v : "full");
export const sheetMonth = (v: string | undefined, fallback: string) => (v && isValidMonth(v) ? v : fallback);

const firstLetter = (s: string) => [...s.trim()][0]?.toUpperCase() ?? "";

export async function buildSheet(month: string, part: SheetPart, lang: Lang): Promise<SheetData> {
  const [first] = monthRange(month);
  const total = daysInMonth(month);
  const from = part === "second" ? 16 : 1;
  const to = part === "first" ? Math.min(15, total) : total;
  const days: SheetDay[] = [];
  for (let d = from; d <= to; d++) {
    const date = addDays(first, d - 1);
    days.push({ date, day: d, dow: weekday(date) });
  }

  const { niyams, options } = await getNiyams();
  const rows: SheetRow[] = niyams.map((n) => {
    let points = String(n.points);
    if (n.type === "count") points = `${n.points_per_unit}×`;
    if (n.type === "choice" || n.type === "multi") {
      const pts = options.filter((o) => o.niyam_id === n.id).map((o) => o.points);
      // multi-choice runs from the smallest single tick up to all of them together
      const most = n.type === "multi" ? pts.reduce((s, x) => s + x, 0) : Math.max(...pts);
      points = pts.length ? `${Math.min(...pts)}–${most}` : "";
    }
    return { no: n.sort_order, name: lang === "gu" ? n.name_gu : n.name_en, points, kind: n.type };
  });

  const choiceLegend = niyams
    .filter((n) => n.type === "choice" || n.type === "multi")
    .flatMap((n) => options.filter((o) => o.niyam_id === n.id))
    .map((o) => {
      const label = lang === "gu" ? o.label_gu : o.label_en;
      return `${firstLetter(label)} = ${label}`;
    })
    .join(" · ");

  return {
    lang, month, monthText: monthLabel(month, lang), part, days, rows, choiceLegend,
    hasCount: niyams.some((n) => n.type === "count"),
  };
}
