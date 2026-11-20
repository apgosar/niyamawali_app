"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dictionaries, fmt, num, type Lang } from "@/i18n";
import type { Dict } from "@/i18n/en";

interface Ctx {
  lang: Lang;
  t: Dict;
  f: typeof fmt;
  n: (v: number | string) => string;
}
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<Ctx>(() => ({ lang, t: dictionaries[lang], f: fmt, n: (v) => num(v) }), [lang]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
