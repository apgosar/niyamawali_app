"use client";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { LANG_COOKIE, type Lang } from "@/i18n";

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const router = useRouter();

  function set(l: Lang) {
    if (l === lang) return;
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  const base = "min-w-11 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors";
  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-0.5 rounded-full border border-gold-300 bg-ivory p-0.5 ${className}`}
    >
      <button type="button" onClick={() => set("gu")} aria-pressed={lang === "gu"}
        className={`${base} ${lang === "gu" ? "bg-gold-500 text-white shadow-sm" : "text-gold-700"}`}>ગુ</button>
      <button type="button" onClick={() => set("en")} aria-pressed={lang === "en"}
        className={`${base} ${lang === "en" ? "bg-gold-500 text-white shadow-sm" : "text-gold-700"}`}>EN</button>
    </div>
  );
}
