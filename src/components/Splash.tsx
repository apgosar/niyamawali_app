"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "./I18nProvider";

/** How long the opening screen stays, counted from when the page started loading. */
const SPLASH_MS = 4500;

/**
 * Opening screen: the Shibir logo and (as `children`) this month's donor.
 * Shown once per app launch – the inline script in the root layout sets data-splash="skip" on <html>
 * for admin pages and for the rest of the session, so it never flashes up again on later pages.
 */
export function Splash({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (document.documentElement.getAttribute("data-splash") === "skip") return; // hidden by CSS already
    try { sessionStorage.setItem("ns_splash", "1"); } catch { /* private mode: it just shows again next time */ }
    // Total time on screen ≈ 4.5 s from the start of loading, but never cut shorter than 1.5 s after it appears.
    const wait = Math.max(1500, SPLASH_MS - Math.round(performance.now()));
    const timers = [
      setTimeout(() => setCanSkip(true), 2000),
      setTimeout(() => setLeaving(true), wait),
      setTimeout(() => setGone(true), wait + 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (gone) return null;
  return (
    <div id="splash" role="presentation" aria-label="Divine Sanskar Shibir"
      onClick={() => { if (canSkip) setLeaving(true); }}
      style={{ paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-y-auto bg-[radial-gradient(900px_600px_at_50%_-10%,#fbe3b4_0%,#fbf0d8_45%,#fbf6ec_100%)] px-6 text-center transition-opacity duration-500 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <div className="splash-logo rounded-full p-1.5 shadow-[0_0_80px_-6px_rgba(212,175,97,0.95)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-512.png" alt="Divine Sanskar Shibir" width={208} height={208} className="h-52 w-52 rounded-full" fetchPriority="high" />
      </div>
      <div className="fade-up" style={{ animationDelay: "250ms" }}>
        <h1 className="font-display text-3xl font-bold text-gold-700">{t.orgName}</h1>
        <p className="mt-1 text-sm tracking-widest text-gold-600">{t.tagline}</p>
      </div>
      <div className="fade-up w-full max-w-sm empty:hidden" style={{ animationDelay: "800ms" }}>{children}</div>
      <p aria-hidden className={`absolute bottom-[max(1.5rem,var(--sab))] text-xs font-semibold text-gold-600 transition-opacity duration-500 ${canSkip ? "opacity-70" : "opacity-0"}`}>
        {t.common.tapToContinue}
      </p>
    </div>
  );
}
