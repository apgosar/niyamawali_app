"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { LangToggle } from "@/components/LangToggle";
import { Avatar } from "@/components/Avatar";
import { NiyamCard } from "@/components/NiyamCard";
import { DonorBanner, type DonorData } from "@/components/DonorBanner";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { scoreEntry, type NiyamDef, type OptionDef } from "@/lib/points";
import { dayLabel, monthOf } from "@/lib/dates";
import { badgeByCode } from "@/lib/badges";

type Entries = Record<number, { value: number; points: number }>;
interface Op { date: string; niyamId: number; value: number }
type Status = "idle" | "saving" | "saved" | "queued";

interface Props {
  student: { name: string; firstName: string; photoKey: string };
  niyams: NiyamDef[];
  options: OptionDef[];
  today: string;
  yesterday: string;
  dates: string[];
  windowDays: number;
  initialEntries: Entries;
  initialTotals: { monthTotal: number; streak: number };
  donor: DonorData | null;
}

const QUEUE_KEY = "ns_queue_v1";

export function TodayClient(p: Props) {
  const { t, lang, n, f } = useI18n();
  const [date, setDate] = useState(p.today);
  const [cache, setCache] = useState<Record<string, Entries>>({ [p.today]: p.initialEntries });
  const [totals, setTotals] = useState(p.initialTotals);
  const [status, setStatus] = useState<Status>("idle");
  const [toast, setToast] = useState<string | null>(null);

  const queue = useRef<Op[]>([]);
  const running = useRef(false);
  const month = monthOf(p.today);

  const entries = cache[date];
  const dayTotal = useMemo(() => Object.values(entries ?? {}).reduce((s, e) => s + e.points, 0), [entries]);

  const persist = () => {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.current)); } catch { /* private mode */ }
  };
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast((c) => (c === m ? null : c)), 4200); };

  const loadDate = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/api/logs?date=${d}`);
      if (res.status === 401) { window.location.assign("/login"); return; }
      if (!res.ok) return;
      const data = await res.json();
      if (queue.current.some((o) => o.date === d)) return; // unsent local changes win
      setCache((c) => ({ ...c, [d]: data.entries }));
      if (!queue.current.length) setTotals({ monthTotal: data.totals.monthTotal, streak: data.totals.streak });
    } catch { /* offline: keep what we have */ }
  }, []);

  const flush = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      if (queue.current.length) setStatus("saving");
      while (queue.current.length) {
        const op = queue.current.shift()!;
        persist();
        let res: Response;
        try {
          res = await fetch("/api/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op) });
        } catch {
          // offline: put it back (unless a newer change for the same niyam arrived meanwhile)
          if (!queue.current.some((o) => o.date === op.date && o.niyamId === op.niyamId)) queue.current.unshift(op);
          persist();
          setStatus("queued");
          return;
        }
        if (res.status === 401) { window.location.assign("/login"); return; }
        if (res.ok) {
          const d = await res.json();
          if (!queue.current.length) setTotals({ monthTotal: d.monthTotal, streak: d.streak });
          const msgs: string[] = [];
          for (const code of d.newBadges ?? []) {
            const b = badgeByCode(code);
            if (b) msgs.push(`${b.icon} ${f(t.today.newBadge, { name: b.name[lang] })}`);
          }
          for (const b of d.bonuses ?? []) msgs.push(`🎁 ${f(t.today.bonus, { n: n(b.points) })}`);
          if (msgs.length) showToast(msgs.join("  ·  "));
        } else {
          loadDate(op.date); // rejected (e.g. day now locked) – show the truth
        }
      }
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1600);
    } finally {
      running.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDate, lang]);

  // Restore changes that could not be sent last time, then sync.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as Op[];
      if (Array.isArray(saved) && saved.length) { queue.current = saved; flush().then(() => loadDate(p.today)); }
    } catch { /* ignore */ }
    const online = () => { flush(); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function change(niyam: NiyamDef, value: number) {
    const prev = entries?.[niyam.id];
    const points = value ? (scoreEntry(niyam, value, p.options) ?? 0) : 0;
    setCache((c) => {
      const day = { ...(c[date] ?? {}) };
      if (value) day[niyam.id] = { value, points }; else delete day[niyam.id];
      return { ...c, [date]: day };
    });
    if (monthOf(date) === month) {
      setTotals((tt) => ({ ...tt, monthTotal: tt.monthTotal + points - (prev?.points ?? 0) }));
    }
    const op: Op = { date, niyamId: niyam.id, value };
    queue.current = queue.current.filter((o) => !(o.date === op.date && o.niyamId === op.niyamId));
    queue.current.push(op);
    persist();
    flush();
  }

  function pickDate(d: string) {
    setDate(d);
    loadDate(d);
  }

  const chipLabel = (d: string) => {
    if (d === p.today) return t.today.todayLabel;
    if (d === p.yesterday) return t.today.yesterday;
    const l = dayLabel(d, lang);
    return `${l.dow} ${n(l.day)}`;
  };

  const statusText = status === "saving" ? t.today.saving : status === "saved" ? t.today.saved : status === "queued" ? t.today.queued : "";

  return (
    <>
      {/* ---- header ---- */}
      <header className="safe-top rounded-b-[2rem] border-b border-gold-100 bg-gradient-to-b from-peach/70 via-gold-50 to-cream px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <Avatar photoKey={p.student.photoKey} name={p.student.name} size={46} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">{t.today.hello} 🙏</p>
            <p className="font-display truncate text-xl font-bold leading-tight text-gold-900">{p.student.name}</p>
          </div>
          <LangToggle />
        </div>

        <div className="card mt-4 grid grid-cols-[1.35fr_1fr] overflow-hidden">
          <div className="border-r border-gold-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.today.dayTotal}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-6xl font-bold leading-none text-gold-600 tabular-nums"><AnimatedNumber value={dayTotal} /></span>
              <span className="text-sm font-semibold text-gold-700">{t.common.pts}</span>
            </p>
            <p aria-live="polite" className={`mt-2 h-4 text-xs font-semibold ${status === "queued" ? "text-danger" : "text-sage-600"}`}>{statusText}</p>
          </div>
          <div className="flex flex-col justify-center gap-3 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t.today.monthTotal}</p>
              <p className="font-display text-3xl font-bold leading-none text-gold-900 tabular-nums"><AnimatedNumber value={totals.monthTotal} /></p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={totals.streak > 0 ? "flame text-xl" : "text-xl opacity-40"}>🪔</span>
              <span className="font-display text-2xl font-bold leading-none text-gold-900">{n(totals.streak)}</span>
              <span className="text-[11px] font-semibold uppercase leading-tight tracking-wider text-muted">{t.today.streak}</span>
            </div>
          </div>
        </div>

        {p.donor && <div className="mt-3"><DonorBanner donor={p.donor} label={t.today.sponsored} /></div>}
      </header>

      {/* ---- day chips ---- */}
      {p.dates.length > 1 && (
        <div className="mt-4 px-4">
          <div role="tablist" aria-label="Day" className="flex gap-2 overflow-x-auto pb-1">
            {p.dates.map((d) => (
              <button key={d} type="button" role="tab" aria-selected={d === date} onClick={() => pickDate(d)}
                className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                  d === date ? "border-gold-500 bg-gold-500 text-white" : "border-gold-100 bg-ivory text-gold-700"}`}>
                {chipLabel(d)}
              </button>
            ))}
          </div>
          <p className="hint mt-1">{f(t.today.editHint, { n: n(p.windowDays - 1) })}</p>
        </div>
      )}

      {date === p.today && dayTotal === 0 && totals.streak > 0 && (
        <p className="mx-4 mt-3 rounded-xl bg-lotus-50 p-3 text-center text-sm font-semibold text-lotus-600">{t.today.streakNudge}</p>
      )}

      {/* ---- niyams ---- */}
      <main className="mt-4 space-y-2.5 px-4">
        {p.niyams.length === 0 && <p className="card p-6 text-center text-muted">{t.today.noNiyams}</p>}
        {entries && p.niyams.map((nm) => (
          <NiyamCard key={`${date}-${nm.id}`} niyam={nm} options={p.options} value={entries[nm.id]?.value ?? 0} onChange={(v) => change(nm, v)} />
        ))}
        {!entries && <p className="py-10 text-center text-muted">{t.common.loading}</p>}
      </main>

      {toast && (
        <div role="status" className="fade-up fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-gold-300 bg-gold-900 px-4 py-3 text-center text-sm font-semibold text-gold-50 shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
