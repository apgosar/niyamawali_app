"use client";
import { optionBit, type NiyamDef, type OptionDef } from "@/lib/points";
import { useI18n } from "./I18nProvider";

interface Props {
  niyam: NiyamDef;
  options: OptionDef[];
  value: number; // 0 = not done
  /** optional text saved with a gatha entry */
  sutra?: string;
  gathaNo?: string;
  /** `details` is only passed when one of the text boxes changed */
  onChange: (value: number, details?: { sutra: string; gatha_no: string }) => void;
  /** The day is submitted / outside the edit window: show the state but do not allow changes. */
  locked?: boolean;
}

const check = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

export function NiyamCard({ niyam, options, value, sutra = "", gathaNo = "", onChange, locked = false }: Props) {
  const { lang, t, n, f } = useI18n();
  const name = lang === "gu" ? niyam.name_gu : niyam.name_en;
  const done = value > 0;
  const shell = `rounded-2xl border-2 p-3 transition-all duration-200 ${
    done ? "border-sage-500 bg-sage-50 shadow-glow" : "border-gold-100 bg-ivory shadow-soft"} ${locked && !done ? "opacity-60" : ""}`;
  const badge = (
    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
      done ? "bg-sage-500 text-white" : "bg-gold-100 text-gold-700"}`}>
      {done && niyam.type === "boolean" ? check : n(niyam.sort_order)}
    </span>
  );

  if (niyam.type === "boolean") {
    return (
      <button type="button" role="switch" aria-checked={done} disabled={locked} onClick={() => onChange(done ? 0 : 1)}
        className={`${shell} flex w-full items-start gap-3 text-left ${locked ? "cursor-not-allowed" : `active:scale-[.985] ${done ? "pop" : ""}`}`}>
        {badge}
        <span className={`flex-1 text-[15px] font-medium leading-snug ${done ? "text-sage-700" : "text-ink"}`}>{name}</span>
        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${done ? "bg-sage-500 text-white" : "bg-gold-50 text-gold-600"}`}>+{n(niyam.points)}</span>
      </button>
    );
  }

  if (niyam.type === "choice" || niyam.type === "multi") {
    const multi = niyam.type === "multi";
    const opts = options.filter((o) => o.niyam_id === niyam.id);
    // multi-choice: the value holds one bit per ticked option (ignoring any option that has since been switched off)
    const ticked = multi ? value & opts.reduce((bits, o) => bits | optionBit(o), 0) : value;
    return (
      <div className={shell}>
        <div className="flex items-start gap-3">
          {badge}
          <span className={`flex-1 text-[15px] font-medium leading-snug ${done ? "text-sage-700" : "text-ink"}`}>{name}</span>
        </div>
        <div role={multi ? "group" : "radiogroup"} aria-label={name} className="mt-3 grid grid-cols-2 gap-2">
          {opts.map((o) => {
            const sel = multi ? (ticked & optionBit(o)) !== 0 : value === o.id;
            const next = multi ? ticked ^ optionBit(o) : sel ? 0 : o.id;
            return (
              <button key={o.id} type="button" role={multi ? "checkbox" : "radio"} aria-checked={sel} disabled={locked} onClick={() => onChange(next)}
                className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${locked ? "cursor-not-allowed" : "active:scale-95"} ${
                  sel ? "border-sage-500 bg-sage-500 text-white" : "border-gold-100 bg-white text-ink"}`}>
                <span className="flex items-center gap-1.5">{multi && sel && check}{lang === "gu" ? o.label_gu : o.label_en}</span>
                <span className={`text-xs ${sel ? "text-white/90" : "text-gold-600"}`}>+{n(o.points)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // count (e.g. new gathas)
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(niyam.max_count, value + 1));
  const btn = "flex h-11 w-11 items-center justify-center rounded-full border-2 text-2xl font-bold leading-none transition active:scale-90 disabled:opacity-35";
  return (
    <div className={shell}>
      <div className="flex items-start gap-3">
        {badge}
        <span className={`flex-1 text-[15px] font-medium leading-snug ${done ? "text-sage-700" : "text-ink"}`}>{name}</span>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-white/70 p-2">
        <span className="pl-1 text-xs text-muted">{f(t.today.perGatha, { n: n(niyam.points_per_unit) })}</span>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="−" className={`${btn} border-gold-300 text-gold-700`} disabled={locked || value <= 0} onClick={dec}>−</button>
          <span aria-live="polite" className="min-w-14 text-center">
            <span className="num text-3xl text-gold-900">{n(value)}</span>
            <span className="block text-[11px] leading-none text-muted">{t.today.gathas}</span>
          </span>
          <button type="button" aria-label="+" className={`${btn} border-sage-500 bg-sage-500 text-white`} disabled={locked || value >= niyam.max_count} onClick={inc}>+</button>
        </div>
        <span className={`min-w-12 pr-1 text-right text-sm font-bold ${done ? "text-sage-700" : "text-muted"}`}>+{n(value * niyam.points_per_unit)}</span>
      </div>
      {/* optional: which Sutra, and which Gatha(s) – offered once at least one gatha is counted */}
      {done && (!locked || sutra || gathaNo) && (
        <div className="mt-2 grid grid-cols-[1.4fr_1fr] gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted">{t.today.sutra} ({t.common.optional})</span>
            <input className="field" value={sutra} maxLength={100} readOnly={locked} placeholder={t.today.sutraHint}
              onChange={(e) => onChange(value, { sutra: e.target.value, gatha_no: gathaNo })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted">{t.today.gathaNo} ({t.common.optional})</span>
            <input className="field" value={gathaNo} maxLength={50} readOnly={locked} placeholder={t.today.gathaNoHint}
              onChange={(e) => onChange(value, { sutra, gatha_no: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}
