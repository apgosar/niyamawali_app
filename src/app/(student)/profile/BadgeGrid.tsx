"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/components/I18nProvider";
import { FitToWidth } from "@/components/FitToWidth";
import { BADGES, type BadgeDef } from "@/lib/badges";
import { usePreparedPng } from "@/lib/render";
import { shareImage } from "@/lib/share";

interface Props {
  /** badge code → date earned (YYYY-MM-DD) */
  earned: Record<string, string>;
  studentName: string;
  referralCode: string;
}

export function BadgeGrid({ earned, studentName, referralCode }: Props) {
  const { lang } = useI18n();
  const [open, setOpen] = useState<BadgeDef | null>(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-2.5">
        {BADGES.map((b) => {
          const got = !!earned[b.code];
          return (
            <li key={b.code}>
              <button type="button" onClick={() => setOpen(b)} aria-label={b.name[lang]}
                className={`h-full w-full rounded-2xl border p-2.5 text-center transition active:scale-95 ${got ? "border-gold-300 bg-gold-50" : "border-gold-100 bg-sand/40"}`}>
                <span className={`block text-3xl ${got ? "" : "opacity-25 grayscale"}`}>{b.icon}</span>
                <span className={`mt-1 block text-[11px] font-bold leading-tight ${got ? "text-gold-900" : "text-muted"}`}>{b.name[lang]}</span>
                <span className="mt-0.5 block text-[10px] leading-tight text-muted">{b.desc[lang]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open && (
        <BadgeModal badge={open} earnedOn={earned[open.code] ?? null} studentName={studentName} referralCode={referralCode} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function BadgeModal({ badge, earnedOn, studentName, referralCode, onClose }: {
  badge: BadgeDef; earnedOn: string | null; studentName: string; referralCode: string; onClose: () => void;
}) {
  const { t, lang, f } = useI18n();
  const card = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const got = !!earnedOn;
  // The picture is built while the card is on screen, so tapping Share can open the share sheet immediately.
  const picture = usePreparedPng(card, "badge", got);
  const dateText = earnedOn
    ? new Date(`${earnedOn}T00:00:00+05:30`).toLocaleDateString(lang === "gu" ? "gu-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })
    : "";

  async function share() {
    if (!picture.blob) return;
    setNote(null);
    const text = `${f(t.badge.shareText, { name: badge.name[lang], desc: badge.desc[lang] })}\n${window.location.origin}/register?ref=${referralCode}`;
    try {
      const r = await shareImage(picture.blob, `niyamawali-badge-${badge.code}.png`, text);
      if (r === "downloaded") setNote(t.badge.saved);
    } catch {
      setNote(t.common.somethingWrong);
    }
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={badge.name[lang]} onClick={onClose}
      className="fixed inset-0 z-[60] overflow-y-auto bg-gold-900/70 backdrop-blur-sm">
     <div className="flex min-h-full items-center justify-center p-4">
      <div className="fade-up w-full max-w-sm rounded-3xl bg-ivory p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-hidden rounded-2xl shadow-soft">
          <FitToWidth width={320}>
            <div ref={card} className="relative flex h-[400px] w-[320px] flex-col items-center bg-cream px-6 pb-5 pt-6 text-center">
              <div className="pointer-events-none absolute inset-2 rounded-lg border-[3px] border-gold-300" />
              <div className="pointer-events-none absolute inset-[14px] rounded-md border border-gold-300" />
              <img src="/icons/icon-192.png" alt="" width={48} height={48} className="rounded-full" />
              <p className="font-display mt-1 text-base font-bold text-gold-700">Divine Sanskar Shibir</p>
              <span className={`mt-4 text-[88px] leading-none ${got ? "" : "opacity-30 grayscale"}`}>{badge.icon}</span>
              <h2 className="font-display mt-3 text-2xl font-bold leading-tight text-gold-900">{badge.name[lang]}</h2>
              <p className="mt-1 px-2 text-sm leading-snug text-ink">{badge.desc[lang]}</p>
              {got && <p className="font-display mt-4 text-xl font-bold text-gold-700">{studentName}</p>}
              <p className="mt-auto text-xs text-gold-700">{got ? t.badge.earnedOn.replace("{date}", dateText) : t.badge.notEarned}</p>
            </div>
          </FitToWidth>
        </div>

        <div className="mt-4 grid gap-2">
          {got && picture.status === "error" && (
            <button type="button" className="btn btn-gold" onClick={picture.retry}>{t.common.retry}</button>
          )}
          {got && picture.status !== "error" && (
            <button type="button" className="btn bg-[#25D366] text-white shadow-soft" disabled={picture.status !== "ready"} onClick={share}>
              {picture.status === "ready" ? t.badge.share : t.sheet.preparing}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t.badge.close}</button>
        </div>
        {picture.status === "error" && <p role="alert" className="err mt-3 text-center">{t.common.somethingWrong}</p>}
        {note && <p role="status" className="mt-3 rounded-xl bg-gold-50 p-3 text-center text-sm text-gold-700">{note}</p>}
      </div>
     </div>
    </div>,
    document.body,
  );
}
