"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useI18n } from "@/components/I18nProvider";
import { LangToggle } from "@/components/LangToggle";
import { Avatar } from "@/components/Avatar";
import { NiyamCard } from "@/components/NiyamCard";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { DonorBanner, type DonorData } from "@/components/DonorBanner";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { scoreEntry, type NiyamDef, type OptionDef } from "@/lib/points";
import { addDays, dayLabel, monthLabel, monthOf, todayIST } from "@/lib/dates";
import { badgeByCode } from "@/lib/badges";
import type { AccessInfo } from "@/lib/access";
import type { StreakRescue } from "@/lib/streaks";

type Entries = Record<number, { value: number; points: number; sutra?: string; gatha_no?: string }>;
interface Op { date: string; niyamId: number; value: number; sutra?: string; gatha_no?: string }
type Status = "saving" | "saved" | "queued";

interface Props {
  student: { name: string; firstName: string; photoKey: string; code: string };
  niyams: NiyamDef[];
  options: OptionDef[];
  today: string;
  yesterday: string;
  initialAccess: AccessInfo;
  initialEntries: Entries;
  initialTotals: { monthTotal: number; streak: number; rescue: StreakRescue | null };
  donor: DonorData | null;
}

const QUEUE_KEY = "ns_queue_v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function TodayClient(p: Props) {
  const { t, lang, n, f } = useI18n();
  const [date, setDate] = useState(p.today);
  const [cache, setCache] = useState<Record<string, Entries>>({ [p.today]: p.initialEntries });
  const [totals, setTotals] = useState(p.initialTotals);
  const [access, setAccess] = useState(p.initialAccess);
  const [status, setStatus] = useState<Status>("saved"); // "saved" = nothing waiting to be sent
  const [toast, setToast] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDay, setLoadingDay] = useState<string | null>(null);

  const totalsCard = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false); // floating bar appears once the totals card scrolls away
  const queue = useRef<Op[]>([]);
  const running = useRef(false);
  const typing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const month = monthOf(p.today);

  const entries = cache[date];
  const dayTotal = useMemo(() => Object.values(entries ?? {}).reduce((s, e) => s + e.points, 0), [entries]);
  const entryCount = Object.keys(entries ?? {}).length;

  const day = access.days.find((d) => d.date === date);
  const editable = !!day?.editable;
  const submitted = !!day?.submitted;
  const viaGrant = !!day?.viaGrant;

  const persist = () => {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.current)); } catch { /* private mode */ }
  };
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast((c) => (c === m ? null : c)), 4200); };
  const when = (iso: string) =>
    new Date(iso).toLocaleString(lang === "gu" ? "gu-IN" : "en-IN", {
      day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
    });

  const loadDate = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/api/logs?date=${d}`);
      if (res.status === 401) { window.location.assign("/login"); return; }
      if (!res.ok) return;
      const data = await res.json();
      setAccess(data.access);
      if (queue.current.some((o) => o.date === d)) return; // unsent local changes win
      setCache((c) => ({ ...c, [d]: data.entries }));
      if (!queue.current.length) setTotals({ monthTotal: data.totals.monthTotal, streak: data.totals.streak, rescue: data.totals.rescue });
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
          if (!queue.current.length) setTotals({ monthTotal: d.monthTotal, streak: d.streak, rescue: d.rescue });
          const msgs = rewardMessages(d);
          if (msgs.length) showToast(msgs.join("  ·  "));
        } else {
          loadDate(op.date); // rejected (e.g. the day was locked) – show the truth
        }
      }
      setStatus("saved");
    } finally {
      running.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDate, lang]);

  useEffect(() => {
    const el = totalsCard.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Leaving the app in the middle of the typing pause: send what is waiting straight away.
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [flush]);

  // The app is often left open overnight: when a new day has started in India, reload so "Today" is really today.
  useEffect(() => {
    const check = () => { if (document.visibilityState === "visible" && todayIST() !== p.today) window.location.reload(); };
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, 60_000);
    return () => { document.removeEventListener("visibilitychange", check); clearInterval(timer); };
  }, [p.today]);

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

  function change(niyam: NiyamDef, value: number, details?: { sutra: string; gatha_no: string }) {
    if (!editable) return;
    const prev = entries?.[niyam.id];
    const points = value ? (scoreEntry(niyam, value, p.options) ?? 0) : 0;
    // gatha entries carry their Sutra / Gatha number along with every change
    const extra = niyam.type === "count" ? (details ?? { sutra: prev?.sutra ?? "", gatha_no: prev?.gatha_no ?? "" }) : {};
    setCache((c) => {
      const d = { ...(c[date] ?? {}) };
      if (value) d[niyam.id] = { value, points, ...extra }; else delete d[niyam.id];
      return { ...c, [date]: d };
    });
    if (monthOf(date) === month) {
      setTotals((tt) => ({ ...tt, monthTotal: tt.monthTotal + points - (prev?.points ?? 0) }));
    }
    const op: Op = { date, niyamId: niyam.id, value, ...extra };
    queue.current = queue.current.filter((o) => !(o.date === op.date && o.niyamId === op.niyamId));
    queue.current.push(op);
    persist();
    clearTimeout(typing.current);
    if (details) {
      // typing in a text box: wait for a pause rather than saving every letter
      setStatus("saving");
      typing.current = setTimeout(flush, 800);
    } else flush();
  }

  /** Wait until every tap has reached the server (false = still offline). */
  async function waitForSaves(): Promise<boolean> {
    flush();
    for (let i = 0; i < 80; i++) {
      if (!queue.current.length && !running.current) return true;
      await sleep(100);
    }
    return false;
  }

  /** "new badge" / "bonus points" lines for the pop-up message */
  function rewardMessages(d: { newBadges?: string[]; bonuses?: { points: number }[] }): string[] {
    const msgs: string[] = [];
    for (const code of d.newBadges ?? []) {
      const b = badgeByCode(code);
      if (b) msgs.push(`${b.icon} ${f(t.today.newBadge, { name: b.name[lang] })}`);
    }
    for (const b of d.bonuses ?? []) msgs.push(`🎁 ${f(t.today.bonus, { n: n(b.points) })}`);
    return msgs;
  }

  async function submitDay() {
    setConfirming(false);
    setSubmitting(true);
    try {
      if (!(await waitForSaves())) { showToast(t.lock.offlineSubmit); return; }
      const res = await fetch("/api/logs/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) });
      if (res.status === 401) { window.location.assign("/login"); return; }
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // submitting is what moves the streak and earns badges
        setAccess(data.access);
        setTotals({ monthTotal: data.monthTotal, streak: data.streak, rescue: data.rescue });
        showToast([t.lock.submittedToast, ...rewardMessages(data)].join("  ·  "));
      }
      else if (data.error === "empty") showToast(t.lock.submitNeedOne);
      else await loadDate(date);
    } catch {
      showToast(t.lock.offlineSubmit);
    } finally {
      setSubmitting(false);
    }
  }

  function pickDate(d: string) {
    setDate(d);
    setLoadingDay(d);
    loadDate(d).finally(() => setLoadingDay((c) => (c === d ? null : c)));
  }

  const chipLabel = (d: string) => {
    if (d === p.today) return t.today.todayLabel;
    if (d === p.yesterday) return t.today.yesterday;
    const l = dayLabel(d, lang);
    return `${l.dow} ${n(l.day)}`;
  };

  /** "Tue 24 Nov" – used where the exact day matters */
  const fullDay = (d: string) => {
    const l = dayLabel(d, lang);
    return `${l.dow} ${n(l.day)} ${monthLabel(monthOf(d), lang).split(" ")[0].slice(0, lang === "en" ? 3 : undefined)}`;
  };
  // after midnight (IST) this day drops out of the normal edit window
  const oldestInWindow = addDays(p.today, 1 - access.windowDays);

  const statusText = status === "saving" ? t.today.saving : status === "saved" ? t.today.saved : t.today.queued;

  return (
    <>
      {/* ---- header ---- */}
      <header className="safe-top rounded-b-[2rem] border-b border-gold-100 bg-gradient-to-b from-peach/70 via-gold-50 to-cream px-4 pb-5 pt-4">
        <div className="flex items-center gap-2.5">
          <Image src="/icons/icon-192.png" alt="Divine Sanskar Shibir" width={40} height={40} priority className="rounded-full shadow-[0_0_18px_-4px_rgba(212,175,97,0.9)]" />
          <p className="font-display flex-1 text-lg font-bold leading-tight text-gold-700">{t.appName}</p>
          <LangToggle />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Avatar photoKey={p.student.photoKey} name={p.student.name} size={46} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">{t.today.hello} 🙏</p>
            <p className="font-display truncate text-xl font-bold leading-tight text-gold-900">{p.student.name}</p>
            <p className="text-xs font-semibold text-muted">{t.lock.studentId}: <span className="num text-gold-700">{p.student.code}</span></p>
          </div>
        </div>

        <div ref={totalsCard} className="card mt-4 grid grid-cols-[1.35fr_1fr] overflow-hidden">
          <div className="border-r border-gold-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{date === p.today ? t.today.dayTotal : `${chipLabel(date)} · ${t.common.points}`}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-6xl leading-none text-gold-600"><AnimatedNumber value={dayTotal} /></span>
              <span className="text-sm font-semibold text-gold-700">{t.common.pts}</span>
            </p>
            <p aria-live="polite" className={`mt-2 h-4 text-xs font-semibold ${status === "queued" ? "text-danger" : "text-sage-600"}`}>{statusText}</p>
          </div>
          <div className="flex flex-col justify-center gap-3 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t.today.monthTotal}</p>
              <p className="num text-3xl leading-none text-gold-900"><AnimatedNumber value={totals.monthTotal} /></p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={totals.streak > 0 ? "flame text-xl" : "text-xl opacity-40"}>🪔</span>
              <span className="num text-2xl leading-none text-gold-900">{n(totals.streak)}</span>
              <span className="text-[11px] font-semibold uppercase leading-tight tracking-wider text-muted">{t.today.streak}</span>
            </div>
          </div>
        </div>

        {p.donor && <div className="mt-3"><DonorBanner donor={p.donor} label={t.today.sponsored} /></div>}
      </header>

      {/* ---- day chips ---- */}
      {access.days.length > 1 && (
        <div className="mt-4 px-4">
          <div role="tablist" aria-label="Day" className="flex gap-2 overflow-x-auto pb-1">
            {access.days.map((d) => (
              <button key={d.date} type="button" role="tab" aria-selected={d.date === date} onClick={() => pickDate(d.date)}
                className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                  d.date === date ? "border-gold-500 bg-gold-500 text-white" : "border-gold-100 bg-ivory text-gold-700"}`}>
                {!d.editable ? "🔒 " : d.viaGrant ? "🔓 " : d.submitted ? "✓ " : ""}{chipLabel(d.date)}
                {loadingDay === d.date && <span aria-hidden className="ml-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]" />}
              </button>
            ))}
          </div>
          <p className="hint mt-1">{f(t.today.editHint, { n: n(access.windowDays - 1) })}</p>
        </div>
      )}

      {/* ---- lock / unlock notices ---- */}
      {day && !editable && (
        <p role="status" className="mx-4 mt-3 rounded-xl border border-gold-300 bg-gold-50 p-3 text-sm font-semibold text-gold-700">
          {f(t.lock.lockedNote, { id: p.student.code })}
        </p>
      )}
      {viaGrant && access.grant && (
        <p role="status" className="mx-4 mt-3 rounded-xl border border-sage-500 bg-sage-50 p-3 text-sm font-semibold text-sage-700">
          {f(t.lock.unlockedUntil, { time: when(access.grant.expires_at) })}
        </p>
      )}

      {/* an older empty day can still continue the streak; otherwise remind about today */}
      {totals.rescue ? (
        <button type="button" onClick={() => pickDate(totals.rescue!.date)}
          className="mx-4 mt-3 block w-[calc(100%-2rem)] rounded-xl border border-lotus-600/30 bg-lotus-50 p-3 text-center text-sm font-semibold text-lotus-600 active:scale-[0.98]">
          🪔 {f(t.today.streakRescue, { day: fullDay(totals.rescue.date), n: n(totals.rescue.run) })}
          {totals.rescue.date === oldestInWindow && <span className="mt-0.5 block text-xs">{t.today.streakLastChance}</span>}
        </button>
      ) : date === p.today && !submitted && totals.streak > 0 && editable ? (
        <p className="mx-4 mt-3 rounded-xl bg-lotus-50 p-3 text-center text-sm font-semibold text-lotus-600">{t.today.streakNudge}</p>
      ) : null}

      {/* ---- niyams ---- */}
      <main className="mt-4 space-y-2.5 px-4 pb-20">
        {p.niyams.length === 0 && <p className="card p-6 text-center text-muted">{t.today.noNiyams}</p>}
        {entries && p.niyams.map((nm) => (
          <NiyamCard key={`${date}-${nm.id}`} niyam={nm} options={p.options} value={entries[nm.id]?.value ?? 0}
            sutra={entries[nm.id]?.sutra} gathaNo={entries[nm.id]?.gatha_no}
            locked={!editable} onChange={(v, details) => change(nm, v, details)} />
        ))}
        {!entries && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16 w-full !rounded-2xl" />)}

        {/* ---- submit / submitted ---- */}
        {entries && day && !submitted && editable && (
          <section className="card mt-4 p-4 text-center">
            <p className="text-sm text-muted">{t.lock.submitHelp}</p>
            <button type="button" className="btn btn-gold mt-3 w-full" disabled={submitting || entryCount === 0} onClick={() => setConfirming(true)}>
              {submitting ? t.lock.submitting : `${t.lock.submitDay} · ${chipLabel(date)}`}
            </button>
            {entryCount === 0 && <p className="hint mt-2">{t.lock.submitNeedOne}</p>}
          </section>
        )}
        {entries && day && submitted && day.submitted_at && (
          <p className="card mt-4 p-4 text-center text-sm font-semibold text-sage-700">{f(t.lock.submittedOn, { when: when(day.submitted_at) })}</p>
        )}
      </main>

      {confirming && (
        <ConfirmSheet
          title={t.lock.confirmTitle}
          body={f(t.lock.confirmBody, { date: chipLabel(date), pts: n(dayTotal) })}
          confirmLabel={t.lock.confirmYes}
          cancelLabel={t.lock.confirmNo}
          onConfirm={submitDay}
          onCancel={() => setConfirming(false)}
        />
      )}

      {/* ---- floating points / save bar (only while the totals card is scrolled out of view) ---- */}
      <div aria-hidden={!showBar} className={`pointer-events-none fixed inset-x-0 top-0 z-50 transition-all duration-200 ${showBar ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
        <div className="mx-auto max-w-md px-3 pt-[max(var(--sat),0.5rem)]">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-gold-300 bg-ivory/95 px-4 py-2 shadow-lg backdrop-blur">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="num text-3xl leading-none text-gold-600"><AnimatedNumber value={dayTotal} /></span>
              <span className="truncate text-xs font-semibold text-gold-700">{t.common.pts} · {!editable && "🔒 "}{date === p.today ? t.today.total : chipLabel(date)}</span>
            </div>
            <span role="status" className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              status === "saved" ? "bg-sage-50 text-sage-700" : status === "saving" ? "bg-gold-100 text-gold-700" : "bg-red-50 text-danger"}`}>
              {status === "saving" && <span className="h-3 w-3 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />}
              {status === "saved" ? "✓ " + t.today.saved.replace("✓", "").trim() : status === "saving" ? t.today.saving : "⚠ " + t.today.queued}
            </span>
          </div>
        </div>
      </div>

      <button type="button" aria-label={t.today.top} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{ bottom: "calc(var(--nav-h) + 1rem)" }}
        className={`fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold-300 bg-ivory text-2xl font-bold text-gold-700 shadow-lg transition-all duration-200 active:scale-90 ${showBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}>
        ↑
      </button>

      {toast && (
        <div role="status" style={{ bottom: "calc(var(--nav-h) + 5rem)" }} className="fade-up fixed inset-x-4 z-50 mx-auto max-w-md rounded-2xl border border-gold-300 bg-gold-900 px-4 py-3 text-center text-sm font-semibold text-gold-50 shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
