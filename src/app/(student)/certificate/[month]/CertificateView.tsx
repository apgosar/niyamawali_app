"use client";
import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { useI18n } from "@/components/I18nProvider";

interface Props {
  name: string; photoKey: string; monthText: string; points: number; rank: number; total: number;
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
  const [busy, setBusy] = useState(false);
  const gu = lang === "gu";

  async function render(): Promise<Blob | null> {
    if (!ref.current) return null;
    return toBlob(ref.current, { pixelRatio: 3, cacheBust: true, backgroundColor: "#fbf6ec" });
  }

  async function download() {
    setBusy(true);
    try {
      const blob = await render();
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${p.fileName}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally { setBusy(false); }
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await render();
      if (!blob) return;
      const file = new File([blob], `${p.fileName}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: t.appName }).catch(() => {});
      else await download();
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-4">
      {/* Designed at 360×450 CSS px, exported at 3× = 1080×1350 */}
      <div ref={wrap} className="mx-auto w-full max-w-[360px]" style={{ height: 450 * scale }}>
       <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 360 }} className="overflow-hidden rounded-xl shadow-soft">
        <div ref={ref} className="relative flex h-[450px] w-[360px] flex-col items-center bg-cream px-8 pb-5 pt-6 text-center">
          <div className="pointer-events-none absolute inset-2 rounded-lg border-[3px] border-gold-300" />
          <div className="pointer-events-none absolute inset-[14px] rounded-md border border-gold-300" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-full" />
          <p className="font-display mt-1 text-lg font-bold text-gold-700">Divine Sanskar Shibir</p>
          <p className="text-[11px] tracking-widest text-gold-600">{gu ? "સંસ્કાર… સાધના… સિદ્ધિ…" : "SANSKAR · SADHANA · SIDDHI"}</p>

          <h2 className="font-display mt-3 text-2xl font-bold text-gold-900">{gu ? "પ્રમાણપત્ર" : "Certificate of Dedication"}</h2>
          <p className="mt-0.5 text-[11px] text-muted">{gu ? "આ પ્રમાણપત્ર પ્રદાન કરવામાં આવે છે" : "Proudly awarded to"}</p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/photo/${p.photoKey}`} alt="" width={76} height={76} className="mt-2 h-[76px] w-[76px] rounded-full border-[3px] border-gold-300 object-cover" />
          <p className="font-display mt-1.5 text-[26px] font-bold leading-tight text-gold-900">{p.name}</p>
          <p className="mt-1 px-2 text-[11px] leading-snug text-muted">
            {gu ? `${p.monthText} માં દૈનિક નિયમ સાધના માટે` : `for daily niyam sadhana in ${p.monthText}`}
          </p>

          <div className="mt-2 flex items-end gap-6">
            <div><p className="num text-4xl leading-none text-gold-600">{p.points}</p><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t.common.points}</p></div>
            <div><p className="num text-4xl leading-none text-lotus-600">#{p.rank}</p><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t.common.rank} / {p.total}</p></div>
          </div>

          <p className="mt-auto text-[11px] text-gold-700">{p.donor ? `${t.today.sponsored}: ${p.donor}` : "🪷"}</p>
        </div>
       </div>
      </div>

      <div className="mx-auto mt-4 grid max-w-[360px] grid-cols-2 gap-3">
        <button type="button" className="btn btn-gold" disabled={busy} onClick={share}>{t.common.share}</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={download}>{t.common.download}</button>
      </div>
    </div>
  );
}
