"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toJpeg } from "html-to-image";
import { useI18n } from "@/components/I18nProvider";
import { FitToWidth } from "@/components/FitToWidth";
import { downloadBlob } from "@/lib/share";
import type { SheetData, SheetPart } from "@/lib/sheet";

interface Props {
  data: SheetData;
  studentName: string;
  studentCode: string;
  months: { value: string; label: string }[];
}

// A4 landscape at 96 dpi
const W = 1123;
const H = 794;
const PAD = 22;
const SR = 30;
const NAME = 400;
const PTS = 54;
const DOW = { en: ["S", "M", "T", "W", "T", "F", "S"], gu: ["ર", "સો", "મં", "બુ", "ગુ", "શુ", "શ"] };
const line = "1px solid #444";

export function SheetView({ data, studentName, studentCode, months }: Props) {
  const { t, f, lang } = useI18n();
  const router = useRouter();
  const sheet = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = (month: string, part: SheetPart) => router.replace(`/sheet?month=${month}&part=${part}`);

  const n = data.days.length;
  const dayW = Math.floor((W - 2 * PAD - SR - NAME - PTS) / n);
  const tableW = SR + NAME + PTS + dayW * n;
  const headH = 34;
  const availH = H - 2 * PAD - 70 - 84;
  const rowH = Math.max(14, Math.min(26, Math.floor((availH - headH) / (data.rows.length + 1))));
  const fs = Math.min(13, rowH - 6);
  const sun = "#efe3c8";

  async function pdf() {
    setBusy(true);
    setError(null);
    try {
      const { jsPDF } = await import("jspdf");
      const img = await toJpeg(sheet.current!, { quality: 0.95, pixelRatio: 2.5, backgroundColor: "#ffffff", cacheBust: true });
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.addImage(img, "JPEG", 0, 0, 297, 210);
      downloadBlob(doc.output("blob"), `niyam-sheet-${studentCode}-${data.month}${data.part === "full" ? "" : "-" + data.part}.pdf`);
    } catch {
      setError(t.sheet.failed);
    } finally {
      setBusy(false);
    }
  }

  const seg = (on: boolean) =>
    `flex-1 rounded-full px-2 py-2 text-center text-xs font-semibold transition ${on ? "bg-gold-500 text-white shadow-sm" : "text-gold-700"}`;

  return (
    <>
      <div className="card space-y-3 p-4">
        <div>
          <label className="label" htmlFor="sheet-month">{t.sheet.month}</label>
          <select id="sheet-month" className="field" value={data.month} onChange={(e) => go(e.target.value, data.part)}>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <p className="label">{t.sheet.period}</p>
          <div className="flex gap-1 rounded-full border border-gold-300 bg-ivory p-1">
            {(["full", "first", "second"] as const).map((p) => (
              <button key={p} type="button" className={seg(data.part === p)} onClick={() => go(data.month, p)}>{t.sheet[p]}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-gold" disabled={busy} onClick={pdf}>{busy ? t.sheet.preparing : `⬇ ${t.sheet.pdf}`}</button>
          <a className="btn btn-ghost" href={`/api/sheet/xlsx?month=${data.month}&part=${data.part}`}>⬇ {t.sheet.excel}</a>
        </div>
        {error && <p role="alert" className="err text-center">{error}</p>}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gold-100 shadow-soft">
        <FitToWidth width={W}>
          <div ref={sheet} style={{ width: W, height: H, padding: PAD, background: "#fff", color: "#111", display: "flex", flexDirection: "column", fontFamily: "var(--font-body), var(--font-gujarati), sans-serif" }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, height: 70, borderBottom: "2px solid #7e5818" }}>
              <img src="/icons/icon-192.png" alt="" width={52} height={52} style={{ borderRadius: 26 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#7e5818", lineHeight: 1.15 }}>Divine Sanskar Shibir · {lang === "gu" ? "નિયમાવલી" : "Niyamawali"}</div>
                <div style={{ fontSize: 13, color: "#444" }}>{t.sheet.sheetTitle}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 14, lineHeight: 1.35 }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{studentName}</div>
                <div>{t.lock.studentId}: <b>{studentCode}</b> &nbsp;·&nbsp; <b>{data.monthText}</b></div>
              </div>
            </div>

            {/* table */}
            <table style={{ tableLayout: "fixed", width: tableW, borderCollapse: "collapse", marginTop: 8, fontSize: fs }}>
              <colgroup>
                <col style={{ width: SR }} /><col style={{ width: NAME }} /><col style={{ width: PTS }} />
                {data.days.map((d) => <col key={d.date} style={{ width: dayW }} />)}
              </colgroup>
              <thead>
                <tr style={{ height: headH, background: "#f5e6bd" }}>
                  <th style={{ border: line }}>#</th>
                  <th style={{ border: line, textAlign: "left", paddingLeft: 6 }}>{t.sheet.niyam}</th>
                  <th style={{ border: line }}>{t.sheet.points}</th>
                  {data.days.map((d) => (
                    <th key={d.date} style={{ border: line, background: d.dow === 0 ? "#e6d3a3" : undefined, lineHeight: 1.1, padding: 0 }}>
                      <div style={{ fontSize: Math.min(13, dayW - 5) }}>{d.day}</div>
                      <div style={{ fontSize: 9, fontWeight: 500 }}>{DOW[lang][d.dow]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.no} style={{ height: rowH }}>
                    <td style={{ border: line, textAlign: "center" }}>{r.no}</td>
                    <td style={{ border: line, paddingLeft: 6, whiteSpace: "nowrap", overflow: "hidden" }}>{r.name}</td>
                    <td style={{ border: line, textAlign: "center", fontSize: fs - 1 }}>{r.points}</td>
                    {data.days.map((d) => <td key={d.date} style={{ border: line, background: d.dow === 0 ? sun : undefined }} />)}
                  </tr>
                ))}
                <tr style={{ height: rowH + 2, fontWeight: 700 }}>
                  <td colSpan={3} style={{ border: line, textAlign: "right", paddingRight: 8 }}>{t.sheet.total}</td>
                  {data.days.map((d) => <td key={d.date} style={{ border: line, background: d.dow === 0 ? sun : undefined }} />)}
                </tr>
              </tbody>
            </table>

            {/* footer */}
            <div style={{ marginTop: "auto", fontSize: 11, lineHeight: 1.4 }}>
              <div>
                {t.sheet.legendTick} {data.hasCount && t.sheet.legendCount} {data.choiceLegend && f(t.sheet.legendChoice, { opts: data.choiceLegend })}
              </div>
              <div style={{ display: "flex", gap: 40, margin: "14px 0 6px", fontSize: 13 }}>
                {[t.sheet.signStudent, t.sheet.signWarden, t.sheet.signParent].map((s) => (
                  <span key={s} style={{ flex: 1, borderBottom: "1px solid #444", paddingBottom: 2 }}>{s}:</span>
                ))}
              </div>
              <div style={{ color: "#555", fontSize: 10 }}>{f(t.sheet.footer, { id: studentCode })}</div>
            </div>
          </div>
        </FitToWidth>
      </div>
    </>
  );
}
