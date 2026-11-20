import { getDashboard } from "@/lib/admin-data";
import { monthLabel } from "@/lib/dates";

export const metadata = { title: "Dashboard" };

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display mt-1 text-4xl font-bold leading-none text-gold-600 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Bars({ data, label }: { data: { key: string; n: number; tip: string }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div role="img" aria-label={label}>
      <div className="flex h-36 items-end gap-[3px]">
        {data.map((d) => (
          <div key={d.key} title={d.tip} className="group flex h-full flex-1 flex-col justify-end">
            <div className="min-h-[2px] rounded-t bg-gradient-to-t from-gold-500 to-gold-300" style={{ height: `${(d.n / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted"><span>{data[0]?.key}</span><span>{data[data.length - 1]?.key}</span></div>
    </div>
  );
}

export default async function Dashboard() {
  const d = await getDashboard();
  const maxRate = Math.max(1, ...d.niyamRates.map((r) => r.n));
  const maxSangh = Math.max(1, ...d.bySangh.map((s) => s.points));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Students" value={d.totalStudents} hint={`${d.newThisMonth} joined this month`} />
        <Stat label="Active today" value={d.activeToday} />
        <Stat label="Active this month" value={d.activeThisMonth} hint={d.totalStudents ? `${Math.round((d.activeThisMonth / d.totalStudents) * 100)}% of students` : undefined} />
        <Stat label="Points this month" value={d.pointsThisMonth.toLocaleString("en-IN")} hint={`avg ${d.avgPointsPerActive} per active student`} />
        <Stat label="Referrals rewarded" value={d.referralsAwarded} />
        <Stat label="Referrals pending" value={d.referralsPending} hint="waiting for logged days" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-lg font-bold text-gold-700">Students logging each day (last 30 days)</h2>
          <Bars label="Daily active students" data={d.daily.map((x) => ({ key: x.date.slice(5), n: x.n, tip: `${x.date}: ${x.n} students` }))} />
        </section>
        <section className="card p-4">
          <h2 className="mb-3 text-lg font-bold text-gold-700">New registrations (last 12 months)</h2>
          {d.registrations.length ? (
            <Bars label="Registrations per month" data={d.registrations.map((x) => ({ key: x.month, n: x.n, tip: `${monthLabel(x.month, "en")}: ${x.n}` }))} />
          ) : <p className="text-sm text-muted">No registrations yet.</p>}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-1 text-lg font-bold text-gold-700">Niyam popularity</h2>
          <p className="hint mb-3">Times each niyam was logged in the last 30 days</p>
          <ul className="space-y-1.5">
            {d.niyamRates.map((r) => (
              <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm">
                <span className="truncate" title={r.name_gu}>{r.name_en}</span>
                <span className="w-8 text-right font-semibold tabular-nums">{r.n}</span>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-gold-100"><span className="block h-full rounded-full bg-sage-500" style={{ width: `${(r.n / maxRate) * 100}%` }} /></span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-4">
          <h2 className="mb-1 text-lg font-bold text-gold-700">Top Sanghs this month</h2>
          <p className="hint mb-3">By total points of their students</p>
          {d.bySangh.length === 0 ? <p className="text-sm text-muted">No data yet.</p> : (
            <ul className="space-y-2">
              {d.bySangh.map((s) => (
                <li key={s.sangh} className="text-sm">
                  <div className="flex justify-between gap-2"><span className="truncate font-medium">{s.sangh}</span><span className="shrink-0 tabular-nums"><b>{s.points}</b> pts · {s.students} students</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gold-100"><div className="h-full rounded-full bg-gold-500" style={{ width: `${(s.points / maxSangh) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
