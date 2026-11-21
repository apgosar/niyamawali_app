import { query } from "@/lib/db";
import { monthLabel, monthOf, todayIST } from "@/lib/dates";
import { Avatar } from "@/components/Avatar";
import { deleteDonor } from "../../actions";
import { SubmitButton } from "@/app/admin/SubmitButton";
import { DonorForm } from "../../forms";

export const metadata = { title: "Donors" };

export default async function DonorsPage() {
  const donors = await query<{ month: string; name: string; photo_key: string | null; message_gu: string | null; message_en: string | null }>(
    "select * from donors order by month desc",
  );
  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h1 className="text-2xl font-bold text-gold-700">Monthly donor / sponsor</h1>
        <p className="mb-4 mt-1 text-sm text-muted">The donor for a month is shown as a banner on every student’s home screen and at the top of the leaderboard, and on certificates.</p>
        <DonorForm defaults={{ month: monthOf(todayIST()) }} />
      </section>
      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold text-gold-700">All donors</h2>
        <ul className="divide-y divide-gold-100">
          {donors.map((d) => (
            <li key={d.month} className="flex items-center gap-3 py-3">
              {d.photo_key ? <Avatar photoKey={d.photo_key} name={d.name} size={48} /> : <span className="text-3xl">🪔</span>}
              <div className="min-w-0 flex-1"><p className="font-semibold">{d.name}</p><p className="truncate text-xs text-muted">{monthLabel(d.month, "en")} · {d.message_en || d.message_gu}</p></div>
              <form action={deleteDonor}><input type="hidden" name="month" value={d.month} /><SubmitButton className="text-sm font-semibold text-danger" pendingText="Removing…">Remove</SubmitButton></form>
            </li>
          ))}
          {donors.length === 0 && <li className="py-4 text-center text-muted">No donors yet.</li>}
        </ul>
      </section>
    </div>
  );
}
