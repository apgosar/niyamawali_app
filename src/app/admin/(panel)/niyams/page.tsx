import { query } from "@/lib/db";
import { addNiyam, updateNiyam, updateOption } from "../../actions";

export const metadata = { title: "Niyams" };

interface N { id: number; sort_order: number; name_gu: string; name_en: string; type: string; points: number; points_per_unit: number; max_count: number; active: boolean }
interface O { id: number; niyam_id: number; label_gu: string; label_en: string; points: number; active: boolean }

export default async function NiyamsPage({ searchParams }: { searchParams: Promise<{ saved?: string; added?: string }> }) {
  const { saved, added } = await searchParams;
  const niyams = await query<N>("select * from niyams order by sort_order, id");
  const options = await query<O>("select * from niyam_options order by niyam_id, sort_order, id");

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <h1 className="text-2xl font-bold text-gold-700">Niyams & points</h1>
        <p className="mt-1 text-sm text-muted">
          Set the points for every niyam. Changes apply to <b>new</b> entries. Tick “also update past entries” to re-score what students
          have already logged (useful when replacing the placeholder 10 points). Untick <i>Active</i> to hide a niyam from students.
        </p>
        {added && <p role="status" className="mt-2 rounded-lg bg-sage-50 p-2 text-sm font-semibold text-sage-700">Niyam added at the end of the list.</p>}
      </div>

      <ul className="space-y-3">
        {niyams.map((n) => (
          <li key={n.id} id={`n${n.id}`} className={`card p-4 ${saved === String(n.id) ? "ring-2 ring-sage-500" : ""} ${n.active ? "" : "opacity-60"}`}>
            <form action={updateNiyam} className="space-y-3">
              <input type="hidden" name="id" value={n.id} />
              <div className="grid gap-3 md:grid-cols-[4.5rem_1fr_1fr]">
                <div><label className="label">No.</label><input name="sort_order" type="number" defaultValue={n.sort_order} className="field" /></div>
                <div><label className="label">Gujarati</label><input name="name_gu" defaultValue={n.name_gu} className="field" required /></div>
                <div><label className="label">English</label><input name="name_en" defaultValue={n.name_en} className="field" required /></div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold uppercase text-gold-700">{n.type === "boolean" ? "Yes / No" : n.type === "count" ? "Count" : "Choice"}</span>
                {n.type === "boolean" && <div className="w-28"><label className="label">Points</label><input name="points" type="number" min={0} defaultValue={n.points} className="field" /></div>}
                {n.type === "count" && (<>
                  <div className="w-32"><label className="label">Points each</label><input name="points_per_unit" type="number" min={0} defaultValue={n.points_per_unit} className="field" /></div>
                  <div className="w-28"><label className="label">Max count</label><input name="max_count" type="number" min={1} defaultValue={n.max_count} className="field" /></div>
                </>)}
                {n.type === "choice" && <p className="pb-3 text-sm text-muted">Points are set per option below.</p>}
                <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={n.active} className="h-5 w-5 accent-[#b8862b]" /> Active</label>
                {n.type !== "choice" && <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="recalc" className="h-5 w-5 accent-[#b8862b]" /> Also update past entries</label>}
                <button className="btn btn-gold ml-auto min-h-10">Save</button>
              </div>
            </form>

            {n.type === "choice" && (
              <div className="mt-3 space-y-2 border-t border-gold-100 pt-3">
                {options.filter((o) => o.niyam_id === n.id).map((o) => (
                  <form key={o.id} action={updateOption} className={`flex flex-wrap items-end gap-3 rounded-xl p-2 ${saved === `o${o.id}` ? "bg-sage-50" : ""}`}>
                    <input type="hidden" name="id" value={o.id} />
                    <div className="min-w-32 flex-1"><label className="label">Gujarati</label><input name="label_gu" defaultValue={o.label_gu} className="field" required /></div>
                    <div className="min-w-32 flex-1"><label className="label">English</label><input name="label_en" defaultValue={o.label_en} className="field" required /></div>
                    <div className="w-24"><label className="label">Points</label><input name="points" type="number" min={0} defaultValue={o.points} className="field" /></div>
                    <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={o.active} className="h-5 w-5 accent-[#b8862b]" /> Active</label>
                    <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="recalc" className="h-5 w-5 accent-[#b8862b]" /> Update past</label>
                    <button className="btn btn-ghost min-h-10">Save</button>
                  </form>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-bold text-gold-700">Add a niyam</h2>
        <form action={addNiyam} className="grid gap-3 md:grid-cols-[1fr_1fr_9rem_7rem_auto] md:items-end">
          <div><label className="label">Gujarati</label><input name="name_gu" className="field" /></div>
          <div><label className="label">English</label><input name="name_en" className="field" /></div>
          <div><label className="label">Type</label><select name="type" className="field"><option value="boolean">Yes / No</option><option value="count">Count (× points)</option></select></div>
          <div><label className="label">Points</label><input name="points" type="number" min={0} defaultValue={10} className="field" /></div>
          <button className="btn btn-gold">Add</button>
        </form>
      </section>
    </div>
  );
}
