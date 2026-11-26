import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteAdmin } from "../../actions";
import { SubmitButton } from "@/app/admin/SubmitButton";
import { AddAdminForm, ChangePasswordForm } from "../../forms";

export const metadata = { title: "Admins" };

export default async function AdminsPage() {
  const me = await requireAdmin();
  const admins = await query<{ id: number; username: string; name: string; created_at: string }>(
    "select id, username, name, (created_at at time zone 'Asia/Kolkata')::text as created_at from admins order by id",
  );
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card p-4">
        <h1 className="mb-2 text-2xl font-bold text-gold-700">Admins</h1>
        <ul className="divide-y divide-gold-100">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-3">
              <div><p className="font-semibold">{a.name} {a.id === me.id && <span className="text-xs text-muted">(you)</span>}</p><p className="text-xs text-muted">@{a.username} · since {a.created_at.slice(0, 10)}</p></div>
              {a.id !== me.id && admins.length > 1 && <form action={deleteAdmin}><input type="hidden" name="id" value={a.id} /><SubmitButton className="text-sm font-semibold text-danger" pendingText="Removing…">Remove</SubmitButton></form>}
            </li>
          ))}
        </ul>
      </section>
      <section className="card p-4"><h2 className="mb-3 text-lg font-bold text-gold-700">Add an admin</h2><AddAdminForm /></section>
      <section className="card p-4"><h2 className="mb-3 text-lg font-bold text-gold-700">Change my password</h2><ChangePasswordForm /></section>
    </div>
  );
}
