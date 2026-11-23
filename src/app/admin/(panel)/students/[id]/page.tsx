import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/admin-data";
import { ageOn, fmtIST, monthLabel, todayIST } from "@/lib/dates";
import { BADGES } from "@/lib/badges";
import { Avatar } from "@/components/Avatar";
import { ordinal, shibirLabels } from "@/lib/profile-options";
import { deleteBonus, toggleStudentActive } from "../../../actions";
import { BonusForm, ResetPinForm } from "../../../forms";
import { RevokeButton, UnlockForm } from "../../../UnlockForm";
import { getSettings } from "@/lib/settings";
import { SubmitButton } from "@/app/admin/SubmitButton";
import { listGrantsFor } from "@/lib/grants";

export const metadata = { title: "Student" };

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-2 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v || "—"}</dd></div>
);

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentDetail(id);
  if (!data) notFound();
  const { s, months, badges, referrals, bonuses, recent, submitted } = data;
  const [settings, grants] = await Promise.all([getSettings(), listGrantsFor(id)]);
  const activeGrant = grants.find((g) => g.active);
  const name = `${s.first_name} ${s.surname}`;
  const have = new Set(badges.map((b) => b.badge_code));
  const phones = [s.father_phone && `Father ${s.father_phone}`, s.mother_phone && `Mother ${s.mother_phone}`, s.own_phone && `Own ${s.own_phone}`].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/students" className="text-sm font-semibold text-gold-600">← All students</Link>
        <Link href={`/admin/students/${id}/entries`} className="btn btn-gold min-h-10 px-4 py-2">📅 Daily entries (date by date)</Link>
      </div>

      <section className="card flex flex-wrap items-center gap-4 p-4">
        <Avatar photoKey={String(s.photo_key)} name={name} size={88} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-gold-900">{name} {!s.active && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 align-middle text-xs text-danger">Deactivated</span>}</h1>
          <p className="text-sm text-muted">{ageOn(String(s.dob), todayIST())} yrs · {String(s.village)} · {String(s.residence)}</p>
          <p className="text-sm text-muted">{String(s.sangh)}</p>
        </div>
        <p className="rounded-xl bg-gold-100 px-4 py-2 text-center"><span className="block text-[11px] font-semibold uppercase text-muted">Student ID</span><span className="num text-xl tracking-wider text-gold-900">{String(s.student_code)}</span></p>
        <p className="rounded-xl bg-gold-50 px-4 py-2 text-center"><span className="block text-[11px] font-semibold uppercase text-muted">Invite code</span><span className="font-mono text-xl font-bold tracking-widest text-gold-700">{String(s.referral_code)}</span></p>
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold text-gold-700">Unlock editing</h2>
        <p className="mb-3 text-sm text-muted">For hostel students or corrections: lets this student change submitted / older days for a limited time. Normal edit window: {settings.editWindowDays} days.</p>
        {activeGrant && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-sage-500 bg-sage-50 p-3 text-sm">
            <span className="font-semibold text-sage-700">🔓 Unlocked: last {activeGrant.days_back} days, until {fmtIST(activeGrant.expires_at)}</span>
            <RevokeButton grantId={activeGrant.id} back={`/admin/students/${id}`} />
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <UnlockForm studentId={id} back={`/admin/students/${id}`} defaultDays={settings.grantDefaultDays} defaultHours={settings.grantDefaultHours} />
          <div>
            <h3 className="mb-1 text-sm font-bold text-gold-700">Recent unlocks</h3>
            <ul className="divide-y divide-gold-100 text-sm">
              {grants.map((g) => (
                <li key={g.id} className="py-1.5">
                  <b>{g.days_back} days</b> · {fmtIST(g.created_at)} → {fmtIST(g.expires_at)}{" "}
                  <span className={g.active ? "font-semibold text-sage-700" : "text-muted"}>{g.active ? "(active)" : g.revoked_at ? "(locked again)" : "(expired)"}</span>
                  <span className="block text-xs text-muted">{g.admin_name ?? "—"}{g.note ? ` · ${g.note}` : ""}</span>
                </li>
              ))}
              {grants.length === 0 && <li className="py-3 text-muted">No unlocks yet.</li>}
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-1 text-lg font-bold text-gold-700">Details</h2>
          <dl className="divide-y divide-gold-100">
            <Row k="Date of birth" v={String(s.dob)} />
            <Row k="Mother" v={s.mother_name ? `${s.mother_name} · ${s.mother_phone}` : null} />
            <Row k="Father" v={s.father_name ? `${s.father_name} · ${s.father_phone}` : null} />
            <Row k="Own number" v={s.own_phone} />
            <Row k="Gender" v={s.gender === "M" ? "Male (M)" : s.gender === "F" ? "Female (F)" : null} />
            <Row k="Current standard" v={s.standard ? `${ordinal(Number(s.standard))} standard` : null} />
            <Row k="Dharmik abhyas" v={s.dharmik_abhyas} />
            <Row k="Previous shibirs" v={shibirLabels(String(s.previous_shibirs ?? "")).join(", ") || "None"} />
            <Row k="Pathshala" v={s.pathshala ? `Yes – ${s.pathshala_name}` : "No"} />
            <Row k="Referred by" v={s.referred_by_name} />
            <Row k="Joined" v={String(s.created_at).slice(0, 10)} />
          </dl>
          {phones.length > 0 && <p className="hint mt-2">Login works with: {phones.join(" · ")}</p>}
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="text-lg font-bold text-gold-700">Actions</h2>
          <ResetPinForm id={id} />
          <div className="divider text-xs">◆</div>
          <BonusForm id={id} />
          <div className="divider text-xs">◆</div>
          <form action={toggleStudentActive}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton className={`btn w-full ${s.active ? "border border-danger text-danger" : "btn-gold"}`} pendingText="Saving…">{s.active ? "Deactivate student" : "Reactivate student"}</SubmitButton>
            {s.active && <p className="hint mt-1">Hides them from the leaderboard and signs them out. Data is kept.</p>}
          </form>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-2 text-lg font-bold text-gold-700">Month by month</h2>
          <table className="w-full text-sm"><thead className="text-xs uppercase text-muted"><tr><th className="py-1 text-left">Month</th><th className="text-right">Days</th><th className="text-right">Points</th></tr></thead>
            <tbody className="divide-y divide-gold-100">
              {months.map((m) => <tr key={m.month}><td className="py-2"><Link href={`/admin/students/${id}/entries?month=${m.month}`} className="font-semibold text-gold-700 hover:underline">{monthLabel(m.month, "en")}</Link></td><td className="text-right tabular-nums">{m.days}</td><td className="text-right font-bold tabular-nums">{m.total}</td></tr>)}
              {months.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted">No activity yet.</td></tr>}
            </tbody></table>
        </section>

        <section className="card p-4">
          <h2 className="mb-2 text-lg font-bold text-gold-700">Last 30 days</h2>
          <ul className="max-h-64 divide-y divide-gold-100 overflow-y-auto text-sm">
            {recent.map((r) => <li key={r.d} className="flex justify-between py-1.5"><span>{r.d}{submitted.has(r.d) && <span title="Submitted (locked)"> 🔒</span>}</span><span className="text-muted">{r.c} niyams</span><b className="tabular-nums">{r.p}</b></li>)}
            {recent.length === 0 && <li className="py-4 text-center text-muted">Nothing logged.</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="mb-2 text-lg font-bold text-gold-700">Badges</h2>
          <ul className="flex flex-wrap gap-2">
            {BADGES.map((b) => <li key={b.code} title={b.desc.en} className={`rounded-full border px-3 py-1 text-sm ${have.has(b.code) ? "border-gold-300 bg-gold-50 font-semibold" : "border-gold-100 text-muted opacity-50"}`}>{b.icon} {b.name.en}</li>)}
          </ul>
          <h3 className="mb-1 mt-4 text-sm font-bold text-gold-700">Referred</h3>
          {referrals.length ? <ul className="text-sm">{referrals.map((r, i) => <li key={i}>{r.first_name} {r.surname} — {r.status}</li>)}</ul> : <p className="text-sm text-muted">No one yet.</p>}
        </section>

        <section className="card p-4">
          <h2 className="mb-2 text-lg font-bold text-gold-700">Bonus points</h2>
          <ul className="divide-y divide-gold-100 text-sm">
            {bonuses.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                <span><b className={b.points < 0 ? "text-danger" : "text-sage-700"}>{b.points > 0 ? "+" : ""}{b.points}</b> <span className="text-muted">· {b.kind} · {b.awarded_on}</span><br /><span className="text-xs text-muted">{b.note}</span></span>
                {b.kind === "manual" && <form action={deleteBonus}><input type="hidden" name="id" value={id} /><input type="hidden" name="bonusId" value={b.id} /><SubmitButton className="text-xs font-semibold text-danger" pendingText="Removing…">Remove</SubmitButton></form>}
              </li>
            ))}
            {bonuses.length === 0 && <li className="py-4 text-center text-muted">None.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
