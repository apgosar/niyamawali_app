import { en, type Dict } from "./en";
import { gu } from "./gu";

export type Lang = "en" | "gu";
export const LANG_COOKIE = "ns_lang";
export const DEFAULT_LANG: Lang = "gu";

export const dictionaries: Record<Lang, Dict> = { en, gu };

export const asLang = (v: string | undefined | null): Lang => (v === "en" || v === "gu" ? v : DEFAULT_LANG);

/** Replace {name} placeholders. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/**
 * Numbers stay in Latin digits in both languages: scores read the same as on the printed sheet,
 * and the Gujarati zero (૦) looks like a ring ("O") at large sizes.
 */
export const num = (n: number | string) => String(n);
