import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDayOverview } from "@/lib/admin-entries";
import { addDays, dayLabel, fmtIST, isValidYmd, monthOf, todayIST } from "@/lib/dates";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Daily entries" };

export default async function DailyPage({ searchParams }: { searchParams: Promise<{ date?: string; q?: string; all?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayIST();
  const date = sp.date && isValidYmd(sp.date) ? sp.date : today;
  const q = sp.q?.trim() ?? "";
  const all = sp.all === "1";
  const { rows, total, withEntries, submitted } = await getDayOverview(date, { q, all });
  const keep = (d: string, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ date: d, ...(q ? { q } : {}), ...(all ? { all: "1" } : {}), ...extra });
    return `/admin/daily?${p}`;
  };
  const dl = dayLabel(date, "en");

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-end gap-3 p-4">
        <Link href={keep(addDays(date, -1))} className="btn btn-ghost min-h-10 px-3" aria-label="Previous day">‹</Link>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div><label className="label" htmlFor="date">Date</label><input id="date" type="date" name="date" defaultValue={date} max={today} className="field min-h-10" /></div>
          <div><label className="label" htmlFor="q">Search ID / name / Sangh</label><input id="q" name="q" defaultValue={q} className="field min-h-10" /></div>
          <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" name="all" value="1" defaultChecked={all} className="h-5 w-5 accent-[#b8862b]" /> Include students with no entries</label>
          <button className="btn btn-gold min-h-10">Show</button>
        </form>
        {date < today && <Link href={keep(addDays(date, 1))} className="btn btn-ghost min-h-10 px-3" aria-label="Next day">›</Link>}
        <a href={`/admin/daily/export?date=${date}`} className="btn btn-ghost min-h-10 sm:ml-auto">⬇ Export CSV</a>
      </section>

      <h1 className="text-2xl font-bold text-gold-700">{dl.dow} {date}</h1>
      <p className="text-sm text-muted"><b>{withEntries}</b> of {total} students entered something · <b>{submitted}</b> submitted the day. Open a student to see exactly what they ticked and when.</p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-gold-50 text-left text-xs uppercase tracking-wide text-gold-700">
            <tr><th className="p-3">ID</th><th className="p-3">Student</th><th className="p-3">Sangh</th><th className="p-3 text-right">Niyams</th><th className="p-3 text-right">Points</th><th className="p-3">Submitted</th><th className="p-3">Last change</th></tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {rows.map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="num p-3 text-sm text-muted">{r.student_code}</td>
                <td className="p-3">
                  <Link href={`/admin/students/${r.id}/entries?month=${monthOf(date)}`} className="flex items-center gap-2 font-semibold text-gold-700 hover:underline">
                    <Avatar photoKey={r.photo_key} name={`${r.first_name} ${r.surname}`} size={32} />{r.first_name} {r.surname}
                  </Link>
                </td>
                <td className="max-w-[14rem] truncate p-3" title={r.sangh}>{r.sangh}</td>
                <td className="num p-3 text-right">{r.count}</td>
                <td className="num p-3 text-right text-lg">{r.points}</td>
                <td className="p-3">{r.submitted_at ? <span className="font-semibold text-sage-700">🔒 {fmtIST(r.submitted_at)}</span> : <span className="text-muted">—</span>}</td>
                <td className="p-3 text-xs text-muted">{r.last_update ? fmtIST(r.last_update) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted">No entries on this date.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
