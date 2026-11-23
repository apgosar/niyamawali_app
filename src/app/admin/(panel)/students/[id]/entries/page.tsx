import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { getMonthEntries } from "@/lib/admin-entries";
import { addMonths, fmtIST, isValidMonth, monthLabel, monthOf, todayIST } from "@/lib/dates";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Daily entries" };

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default async function StudentEntriesPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { month: m } = await searchParams;
  const cur = monthOf(todayIST());
  const month = m && isValidMonth(m) ? m : cur;
  const s = /^[0-9a-f-]{36}$/i.test(id)
    ? await one<{ id: string; student_code: string; first_name: string; surname: string; photo_key: string; sangh: string }>(
        "select id, student_code, first_name, surname, photo_key, sangh from students where id = $1", [id])
    : null;
  if (!s) notFound();
  const e = await getMonthEntries(id, month);
  const name = `${s.first_name} ${s.surname}`;
  const dailyList = Object.entries(e.daily).filter(([, d]) => d.count > 0 || d.submitted_at).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div className="space-y-5">
      <Link href={`/admin/students/${id}`} className="text-sm font-semibold text-gold-600">← {name}</Link>

      <section className="card flex flex-wrap items-center gap-4 p-4">
        <Avatar photoKey={s.photo_key} name={name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-gold-900">{name}</h1>
          <p className="text-sm text-muted"><span className="num rounded-full bg-gold-100 px-2 py-0.5 font-bold text-gold-700">{s.student_code}</span> · {s.sangh}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/students/${id}/entries?month=${addMonths(month, -1)}`} className="btn btn-ghost min-h-10 px-3" aria-label="Previous month">‹</Link>
          <form method="get" className="flex items-center gap-2">
            <input type="month" name="month" defaultValue={month} className="field min-h-10 w-44" aria-label="Month" />
            <button className="btn btn-gold min-h-10 px-4">Show</button>
          </form>
          {month < cur && <Link href={`/admin/students/${id}/entries?month=${addMonths(month, 1)}`} className="btn btn-ghost min-h-10 px-3" aria-label="Next month">›</Link>}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          [monthLabel(month, "en"), "Month"],
          [String(e.logPoints + e.bonusPoints), "Total points"],
          [String(e.activeDays), "Days with entries"],
          [String(e.submittedDays), "Days submitted"],
          [String(e.bonusPoints), "Bonus points"],
        ].map(([v, l]) => (
          <div key={l} className="card p-3 text-center"><p className="num text-2xl text-gold-600">{v}</p><p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{l}</p></div>
        ))}
      </section>

      {/* month grid: niyams down the side, days across – like the printed sheet */}
      <section className="card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gold-700">{monthLabel(month, "en")} — what was entered</h2>
          <a href={`/admin/students/${id}/entries/export?month=${month}`} className="btn btn-ghost min-h-9 px-3 py-1.5 text-sm">⬇ Export CSV</a>
        </div>
        <p className="mb-2 text-xs text-muted">✓ = done · number = gathas · letter = choice (B Biyasana, E Ekasana, A Ayambil, U Upvas) · 🔒 = day submitted · hover a cell for the time it was last changed.</p>
        <div className="overflow-x-auto rounded-xl border border-gold-100">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gold-100 text-gold-900">
                <th className="sticky left-0 z-10 min-w-[15rem] bg-gold-100 p-2 text-left">Niyam</th>
                {e.days.map((d) => (
                  <th key={d.date} className={`min-w-[1.9rem] p-1 text-center ${d.dow === 0 ? "bg-gold-300/60" : ""}`} title={d.date}>
                    <div className="num text-[12px]">{d.day}</div>
                    <div className="text-[9px] font-medium">{DOW[d.dow]}</div>
                    <div className="h-3 text-[9px]" title={e.daily[d.date]?.submitted_at ? `Submitted ${fmtIST(e.daily[d.date].submitted_at!)}` : ""}>{e.daily[d.date]?.submitted_at ? "🔒" : ""}</div>
                  </th>
                ))}
                <th className="p-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {e.niyams.map((n) => (
                <tr key={n.id} className="border-t border-gold-100">
                  <td className="sticky left-0 z-10 max-w-[15rem] truncate bg-ivory p-2" title={n.name_gu}>
                    <span className="num mr-1.5 text-muted">{n.no}</span>{n.name_en}{!n.active && <span className="ml-1 text-[10px] text-muted">(hidden)</span>}
                  </td>
                  {e.days.map((d) => {
                    const c = e.cells[`${n.id}:${d.date}`];
                    return (
                      <td key={d.date} title={c ? `${c.full} · ${c.points} pts · changed ${fmtIST(c.updated_at)}` : ""}
                        className={`p-0 text-center ${c ? "bg-sage-50 font-bold text-sage-700" : d.dow === 0 ? "bg-gold-50" : ""}`}>
                        {c?.short ?? ""}
                      </td>
                    );
                  })}
                  <td className="num p-2 text-right font-semibold">{e.rowTotals[n.id] ?? ""}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gold-300 bg-gold-50 font-bold">
                <td className="sticky left-0 z-10 bg-gold-50 p-2 text-right">Day total</td>
                {e.days.map((d) => <td key={d.date} className="num p-1 text-center text-[11px]">{e.daily[d.date]?.points || ""}</td>)}
                <td className="num p-2 text-right text-gold-700">{e.logPoints}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* day by day: exact values and times */}
      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold text-gold-700">Day by day</h2>
        {dailyList.length === 0 ? <p className="py-4 text-center text-sm text-muted">Nothing entered in this month.</p> : (
          <ul className="space-y-2">
            {dailyList.map(([date, d]) => {
              const dow = e.days.find((x) => x.date === date)!;
              const rows = e.niyams.filter((n) => e.cells[`${n.id}:${date}`]);
              return (
                <li key={date}>
                  <details className="rounded-xl border border-gold-100 bg-white">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm">
                      <b className="w-28">{date} <span className="text-muted">{DOW[dow.dow]}</span></b>
                      <span><b className="num">{d.points}</b> pts</span>
                      <span className="text-muted">{d.count} niyam{d.count === 1 ? "" : "s"}</span>
                      <span className={d.submitted_at ? "font-semibold text-sage-700" : "text-muted"}>{d.submitted_at ? `🔒 submitted ${fmtIST(d.submitted_at)}` : "not submitted"}</span>
                      {d.last_update && <span className="text-xs text-muted">last change {fmtIST(d.last_update)}</span>}
                    </summary>
                    <div className="overflow-x-auto border-t border-gold-100 p-3">
                      <table className="w-full min-w-[28rem] text-sm">
                        <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-1">#</th><th>Niyam</th><th>Entered</th><th className="text-right">Points</th><th className="text-right">Last changed</th></tr></thead>
                        <tbody className="divide-y divide-gold-100">
                          {rows.map((n) => {
                            const c = e.cells[`${n.id}:${date}`];
                            return <tr key={n.id}><td className="num py-1 text-muted">{n.no}</td><td>{n.name_en}</td><td className="font-semibold text-sage-700">{c.full}</td><td className="num text-right">{c.points}</td><td className="text-right text-xs text-muted">{fmtIST(c.updated_at)}</td></tr>;
                          })}
                          {rows.length === 0 && <tr><td colSpan={5} className="py-2 text-muted">No niyams left ticked on this day.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {e.bonuses.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 text-lg font-bold text-gold-700">Bonus points this month</h2>
          <ul className="divide-y divide-gold-100 text-sm">
            {e.bonuses.map((b) => <li key={b.id} className="flex justify-between gap-3 py-2"><span><b className={b.points < 0 ? "text-danger" : "text-sage-700"}>{b.points > 0 ? "+" : ""}{b.points}</b> · {b.kind} · {b.date}</span><span className="text-muted">{b.note}</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
