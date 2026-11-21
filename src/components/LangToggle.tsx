"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { LANG_COOKIE, type Lang } from "@/i18n";

/** Remember the choice for a year (a cookie the server reads on every page). */
function rememberLang(l: Lang) {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [clicked, setClicked] = useState<Lang | null>(null);

  function set(l: Lang) {
    if (l === lang || pending) return;
    rememberLang(l);
    setClicked(l);
    startTransition(() => router.refresh());
  }

  // While the page is re-rendering in the new language, show the tapped language as selected with a spinner.
  const shown = pending && clicked ? clicked : lang;
  const base = "relative min-w-11 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors";
  const btn = (l: Lang, label: string) => (
    <button type="button" onClick={() => set(l)} aria-pressed={shown === l} disabled={pending && shown !== l}
      className={`${base} ${shown === l ? "bg-gold-500 text-white shadow-sm" : "text-gold-700"}`}>
      {pending && shown === l ? <span aria-hidden className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent align-[-2px]" /> : label}
    </button>
  );
  return (
    <div role="group" aria-label="Language" aria-busy={pending}
      className={`inline-flex items-center gap-0.5 rounded-full border border-gold-300 bg-ivory p-0.5 ${className}`}>
      {btn("gu", "ગુ")}
      {btn("en", "EN")}
    </div>
  );
}
