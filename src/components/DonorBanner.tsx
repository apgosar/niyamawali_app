"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "./I18nProvider";

export interface DonorData {
  lines: string[]; // up to three name lines, in the current language
  photo_key: string | null;
  message: string | null;
}

/** The name lines: the first one large, the following ones a little smaller. */
export function DonorName({ lines, large = false }: { lines: string[]; large?: boolean }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className={`block break-words leading-snug ${i === 0
          ? `font-display font-bold text-gold-900 ${large ? "text-2xl" : "text-[17px]"}`
          : `font-semibold text-ink/85 ${large ? "mt-0.5 text-base" : "text-[13px]"}`}`}>
          {line}
        </span>
      ))}
    </>
  );
}

/** Donor card on the niyam screen. Tapping it opens the full name with the enlarged photo. */
export function DonorBanner({ donor, label }: { donor: DonorData; label: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind must not scroll
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className="relative block w-full overflow-hidden rounded-2xl border border-gold-300 bg-gradient-to-r from-gold-50 via-peach/50 to-gold-50 p-3 text-left shadow-soft active:scale-[0.99]">
        <span className="flex items-center gap-3">
          {donor.photo_key ? (
            // a thumbnail cut from the lower part of the photo (slightly zoomed in), where the people are
            <span className="block h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full border-2 border-gold-300 bg-sand">
              <img src={`/api/photo/${donor.photo_key}`} alt="" width={72} height={72} className="h-full w-full origin-bottom scale-[1.2] object-cover object-bottom" />
            </span>
          ) : (
            <span className="text-4xl">🪔</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-gold-600">{label}:</span>
            <DonorName lines={donor.lines} />
            {donor.message && <span className="block text-[13px] leading-snug text-ink/80">{donor.message}</span>}
          </span>
          <span aria-hidden className="self-start text-sm text-gold-600">⤢</span>
        </span>
      </button>

      {/* drawn on <body>: a parent with an animation would otherwise trap a fixed overlay */}
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(false)}
          className="safe-overlay fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div onClick={(e) => e.stopPropagation()} className="fade-up max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-gold-300 bg-ivory p-4 text-center shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">{label}:</p>
            {donor.photo_key ? (
              <img src={`/api/photo/${donor.photo_key}`} alt={donor.lines.join(", ")} className="mx-auto mt-3 max-h-[55dvh] w-auto max-w-full rounded-2xl border border-gold-300" />
            ) : (
              <p className="mt-3 text-6xl">🪔</p>
            )}
            <p className="mt-3"><DonorName lines={donor.lines} large /></p>
            {donor.message && <p className="mt-1 text-sm text-ink/80">{donor.message}</p>}
            <button type="button" autoFocus onClick={() => setOpen(false)} className="btn btn-gold mt-4 w-full">{t.common.close}</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
