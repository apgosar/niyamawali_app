import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { listActiveGrants, searchStudents } from "@/lib/grants";
import { fmtIST } from "@/lib/dates";
import { Avatar } from "@/components/Avatar";
import { RevokeButton, UnlockForm } from "../../UnlockForm";

export const metadata = { title: "Unlock edits" };

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string; err?: string }> }) {
  const { q = "", ok, err } = await searchParams;
  const [settings, active, found] = await Promise.all([getSettings(), listActiveGrants(), searchStudents(q)]);
  const back = `/admin/unlock${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h1 className="text-2xl font-bold text-gold-700">Unlock editing</h1>
        <p className="mt-1 text-sm text-muted">
          Students cannot change a day after submitting it, or after the normal edit window ({settings.editWindowDays} days). When a parent
          calls — for example with the hostel sheet — find the student by <b>Student ID</b> and unlock the last few days for a limited time.
        </p>
        <form method="get" className="mt-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} className="field min-w-0 flex-1" placeholder="Student ID (e.g. 26-00001), name or phone" autoFocus aria-label="Search student" />
          <button className="btn btn-gold">Search</button>
        </form>
        {ok && <p role="status" className="mt-3 rounded-xl bg-sage-50 p-3 text-sm font-semibold text-sage-700">{ok}</p>}
        {err && <p role="alert" className="err mt-3 rounded-xl bg-red-50 p-3">{err}</p>}
      </section>

      {q && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gold-700">{found.length ? `${found.length} found` : "No student found"}</h2>
          {found.map((s) => (
            <div key={s.id} className={`card p-4 ${s.active ? "" : "opacity-60"}`}>
              <div className="mb-3 flex items-center gap-3">
                <Avatar photoKey={s.photo_key} name={`${s.first_name} ${s.surname}`} size={52} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/students/${s.id}`} className="font-display block truncate text-xl font-bold text-gold-900 hover:underline">{s.first_name} {s.surname}</Link>
                  <p className="text-sm text-muted"><span className="num rounded-full bg-gold-100 px-2 py-0.5 font-bold text-gold-700">{s.student_code}</span> · {s.sangh} · {s.residence}{!s.active && " · deactivated"}</p>
                </div>
              </div>
              {s.grant_id && s.grant_expires && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-sage-500 bg-sage-50 p-3 text-sm">
                  <span className="font-semibold text-sage-700">🔓 Unlocked: last {s.grant_days} days, until {fmtIST(s.grant_expires)}</span>
                  <RevokeButton grantId={s.grant_id} back={back} />
                </div>
              )}
              <UnlockForm studentId={s.id} back={back} defaultDays={settings.grantDefaultDays} defaultHours={settings.grantDefaultHours} compact />
            </div>
          ))}
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold text-gold-700">Active unlocks ({active.length})</h2>
        {active.length === 0 ? <p className="text-sm text-muted">Nothing is unlocked right now.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="py-2">Student</th><th>Days</th><th>Until</th><th>By</th><th>Note</th><th /></tr></thead>
              <tbody className="divide-y divide-gold-100">
                {active.map((g) => (
                  <tr key={g.id}>
                    <td className="py-2"><Link href={`/admin/students/${g.student_id}`} className="font-semibold hover:underline">{g.first_name} {g.surname}</Link> <span className="num text-xs text-muted">{g.student_code}</span></td>
                    <td className="num">{g.days_back}</td>
                    <td>{fmtIST(g.expires_at)}</td>
                    <td>{g.admin_name ?? "—"}</td>
                    <td className="max-w-[14rem] truncate text-muted" title={g.note ?? ""}>{g.note}</td>
                    <td className="text-right"><RevokeButton grantId={g.id} back="/admin/unlock" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
