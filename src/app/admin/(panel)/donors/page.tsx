import { query } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import { deleteDonor } from "../../actions";
import { SubmitButton } from "@/app/admin/SubmitButton";
import { DonorForm } from "../../forms";

export const metadata = { title: "Donors" };

export default async function DonorsPage() {
  const donors = await query<{ id: number; name: string; name_gu: string | null; photo_key: string | null; message_gu: string | null; message_en: string | null }>(
    "select id, name, name_gu, photo_key, message_gu, message_en from donors order by created_at desc, id desc",
  );
  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h1 className="text-2xl font-bold text-gold-700">Donors</h1>
        <p className="mb-4 mt-1 text-sm text-muted">The newest donor you add is shown on the opening screen, on every student’s home screen, on the shared results and on certificates. Remove a donor to stop showing them.</p>
        <DonorForm />
      </section>
      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold text-gold-700">All donors</h2>
        <ul className="divide-y divide-gold-100">
          {donors.map((d, i) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              {d.photo_key ? <Avatar photoKey={d.photo_key} name={d.name} size={64} className="object-[center_80%]" /> : <span className="text-3xl">🪔</span>}
              <div className="min-w-0 flex-1">
                {i === 0 && <span className="rounded bg-sage-50 px-2 py-0.5 text-xs font-semibold text-sage-700">Showing now</span>}
                <p className="whitespace-pre-line font-semibold">{d.name}</p>
                {d.name_gu && <p className="whitespace-pre-line text-sm text-muted">{d.name_gu}</p>}
                <p className="truncate text-xs text-muted">{d.message_en || d.message_gu}</p>
              </div>
              <form action={deleteDonor}><input type="hidden" name="id" value={d.id} /><SubmitButton className="text-sm font-semibold text-danger" pendingText="Removing…">Remove</SubmitButton></form>
            </li>
          ))}
          {donors.length === 0 && <li className="py-4 text-center text-muted">No donors yet.</li>}
        </ul>
      </section>
    </div>
  );
}
