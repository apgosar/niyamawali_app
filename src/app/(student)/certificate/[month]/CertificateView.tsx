"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { usePreparedPng } from "@/lib/render";
import { downloadBlob, shareImage } from "@/lib/share";

interface Props {
  name: string; photoKey: string; monthText: string; points: number;
  donor: string | null; fileName: string;
}

export function CertificateView(p: Props) {
  const { lang, t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Fit the fixed-size card to narrow phones; the export captures the un-scaled node.
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (wrap.current?.clientWidth ?? 360) / 360));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const gu = lang === "gu";
  // Built while the page is open, so Share can start the moment it is tapped.
  const picture = usePreparedPng(ref, "certificate");
  const ready = picture.status === "ready" && !!picture.blob;
  const file = `${p.fileName}.png`;
  // the donor takes three short lines at the foot: the first name line, then the others side by side
  const [donorFirst, ...donorRest] = p.donor?.split("\n") ?? [];

  async function share() {
    if (!picture.blob) return;
    try { await shareImage(picture.blob, file, t.appName); } catch { /* ignore */ }
  }

  return (
    <div className="mt-4">
      {/* Designed at 360×450 CSS px, exported at 3× = 1080×1350 */}
      <div ref={wrap} className="mx-auto w-full max-w-[360px]" style={{ height: 450 * scale }}>
       <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 360 }} className="overflow-hidden rounded-xl shadow-soft">
        <div ref={ref} className="relative flex h-[450px] w-[360px] flex-col items-center bg-cream px-8 pb-[22px] pt-5 text-center">
          <div className="pointer-events-none absolute inset-2 rounded-lg border-[3px] border-gold-300" />
          <div className="pointer-events-none absolute inset-[14px] rounded-md border border-gold-300" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={52} height={52} className="h-[52px] w-[52px] rounded-full" />
          <p className="font-display mt-1 text-lg font-bold text-gold-700">Divine Sanskar Shibir</p>
          <p className="text-[11px] tracking-widest text-gold-600">{gu ? "સંસ્કાર… સાધના… સિદ્ધિ…" : "SANSKAR · SADHANA · SIDDHI"}</p>

          <h2 className="font-display mt-2 text-2xl font-bold text-gold-900">{gu ? "પ્રમાણપત્ર" : "Certificate of Dedication"}</h2>
          <p className="mt-0.5 text-[11px] text-muted">{gu ? "આ પ્રમાણપત્ર પ્રદાન કરવામાં આવે છે" : "Proudly awarded to"}</p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/photo/${p.photoKey}`} alt="" width={64} height={64} className="mt-1.5 h-16 w-16 rounded-full border-[3px] border-gold-300 object-cover" />
          <p className="font-display mt-1.5 text-[26px] font-bold leading-tight text-gold-900">{p.name}</p>
          <p className="mt-1 px-2 text-[11px] leading-snug text-muted">
            {gu ? `${p.monthText} માં દૈનિક નિયમ સાધના માટે` : `for daily niyam sadhana in ${p.monthText}`}
          </p>

          <div className="mt-2">
            <p className="num text-5xl leading-none text-gold-600">{p.points}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t.common.points}</p>
          </div>

          {p.donor ? (
            <p className="mt-auto text-[9.5px] leading-[1.35] text-gold-700">
              <span className="block font-semibold">{t.today.sponsored}:</span>
              <span className="block">{donorFirst}</span>
              {donorRest.length > 0 && <span className="block">{donorRest.join("  ·  ")}</span>}
            </p>
          ) : (
            <p className="mt-auto text-[11px] text-gold-700">🪷</p>
          )}
        </div>
       </div>
      </div>

      <div className="mx-auto mt-4 max-w-[360px]">
        {picture.status === "error" ? (
          <button type="button" className="btn btn-gold w-full" onClick={picture.retry}>{t.common.retry}</button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn btn-gold" disabled={!ready} onClick={share}>{ready ? t.common.share : t.sheet.preparing}</button>
            <button type="button" className="btn btn-ghost" disabled={!ready} onClick={() => picture.blob && downloadBlob(picture.blob, file)}>{t.common.download}</button>
          </div>
        )}
        {picture.status === "error" && <p role="alert" className="err mt-2 text-center">{t.common.somethingWrong}</p>}
      </div>
    </div>
  );
}
