import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { addMonths, daysInMonth, monthLabel, monthOf, monthRange, todayIST, weekday, isValidMonth } from "@/lib/dates";
import { getMonthDays, getMonthlyTotals } from "@/lib/logs";
import { studentRank } from "@/lib/leaderboard";

export const metadata = { title: "Progress" };

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const student = await requireStudent();
  const { t, lang } = await getT();
  const { m } = await searchParams;
  const current = monthOf(todayIST());
  const month = m && isValidMonth(m) && m <= current ? m : current;

  const [days, monthly] = await Promise.all([getMonthDays(student.id, month), getMonthlyTotals(student.id)]);
  const values = Object.values(days);
  const max = Math.max(1, ...values);
  const total = monthly.find((x) => x.month === month)?.total ?? 0;
  const active = values.length;
  const best = values.length ? Math.max(...values) : 0;
  const lead = weekday(monthRange(month)[0]);
  const n = daysInMonth(month);
  const dow = lang === "gu" ? ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"] : ["S", "M", "T", "W", "T", "F", "S"];

  const shade = (p?: number) => {
    if (!p) return "bg-sand/60 text-muted";
    const r = p / max;
    if (r > 0.75) return "bg-sage-600 text-white";
    if (r > 0.5) return "bg-sage-500 text-white";
    if (r > 0.25) return "bg-sage-100 text-sage-700";
    return "bg-sage-50 text-sage-700";
  };

  const nav = "flex h-10 w-10 items-center justify-center rounded-full border border-gold-300 bg-ivory text-xl text-gold-700";
  const rank = month < current ? await studentRank(month, student.id) : null;

  return (
    <>
      <header className="safe-top rounded-b-[2rem] border-b border-gold-100 bg-gradient-to-b from-peach/70 via-gold-50 to-cream px-4 pb-5 pt-5">
        <h1 className="text-center text-3xl font-bold text-gold-700">{t.progress.title}</h1>
        <div className="mt-3 flex items-center justify-between">
          <Link href={`/progress?m=${addMonths(month, -1)}`} replace className={nav} aria-label="Previous month">‹</Link>
          <span className="font-display text-xl font-bold text-gold-900">{monthLabel(month, lang)}</span>
          {month < current ? <Link href={`/progress?m=${addMonths(month, 1)}`} replace className={nav} aria-label="Next month">›</Link> : <span className="h-10 w-10" />}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[[t.progress.total, total], [t.progress.activeDays, active], [t.progress.best, best]].map(([label, val]) => (
            <div key={String(label)} className="card py-3">
              <p className="font-display text-3xl font-bold leading-none text-gold-600">{val}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
            </div>
          ))}
        </div>
      </header>

      <main className="space-y-5 px-4 pt-5">
        <section className="card p-4">
          <h2 className="mb-3 text-lg font-bold text-gold-700">{t.progress.calendar}</h2>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {dow.map((d, i) => <span key={i} className="pb-1 text-[11px] font-semibold text-muted">{d}</span>)}
            {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: n }).map((_, i) => {
              const key = `${month}-${String(i + 1).padStart(2, "0")}`;
              const p = days[key];
              return (
                <span key={key} title={p ? `${p}` : ""} className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] leading-none ${shade(p)} ${key === todayIST() ? "ring-2 ring-gold-500" : ""}`}>
                  <span className="font-semibold">{i + 1}</span>
                  {p ? <span className="mt-0.5 text-[10px] opacity-90">{p}</span> : null}
                </span>
              );
            })}
          </div>
          {values.length === 0 && <p className="mt-3 text-center text-sm text-muted">{t.progress.noData}</p>}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-lg font-bold text-gold-700">{t.progress.months}</h2>
          <ul className="divide-y divide-gold-100">
            {monthly.map((row) => {
              const closed = row.month < current;
              return (
                <li key={row.month} className="flex items-center justify-between gap-2 py-2.5">
                  <Link href={`/progress?m=${row.month}`} replace className="flex-1 font-semibold">{monthLabel(row.month, lang)}</Link>
                  <span className="font-display text-xl font-bold text-gold-900">{row.total}</span>
                  {closed ? (
                    <a href={`/certificate/${row.month}`} className="rounded-full border border-gold-300 px-3 py-1 text-xs font-semibold text-gold-700">🏅 {t.progress.certificate}</a>
                  ) : (
                    <span className="w-24 text-right text-[11px] leading-tight text-muted">{t.progress.certificateHint}</span>
                  )}
                </li>
              );
            })}
            {monthly.length === 0 && <li className="py-3 text-center text-sm text-muted">{t.progress.noData}</li>}
          </ul>
        </section>
        {rank && <p className="text-center text-sm text-muted">{monthLabel(month, lang)} · {t.common.rank} #{rank.rank}</p>}
      </main>
    </>
  );
}
