import Link from "next/link";
import { parseFilters, queryStudents } from "@/lib/admin-data";
import { monthLabel } from "@/lib/dates";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Students" };
const PAGE = 50;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const { rows, total } = await queryStudents(f, { limit: PAGE, offset: (page - 1) * PAGE });
  const pages = Math.max(1, Math.ceil(total / PAGE));

  // keep every filter when sorting / paging / exporting
  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) { const val = Array.isArray(v) ? v[0] : v; if (val && !["page", "sort", "dir"].includes(k)) base.set(k, val); }
  const link = (extra: Record<string, string>) => { const q = new URLSearchParams(base); for (const [k, v] of Object.entries(extra)) q.set(k, v); return `/admin/students?${q}`; };
  const sortLink = (col: string) => link({ sort: col, dir: f.sort === col && f.dir === "desc" ? "asc" : "desc" });
  const arrow = (col: string) => (f.sort === col ? (f.dir === "asc" ? " ↑" : " ↓") : "");
  const exportQs = new URLSearchParams(base); exportQs.set("sort", f.sort ?? "points"); exportQs.set("dir", f.dir ?? "desc");
  const range = f.from === f.to ? monthLabel(f.from, "en") : `${monthLabel(f.from, "en")} – ${monthLabel(f.to, "en")}`;

  return (
    <div className="space-y-4">
      <form method="get" className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="label" htmlFor="from">From month</label><input id="from" type="month" name="from" defaultValue={f.from} className="field" /></div>
          <div><label className="label" htmlFor="to">To month</label><input id="to" type="month" name="to" defaultValue={f.to} className="field" /></div>
          <div><label className="label" htmlFor="min">Min points in range</label><input id="min" type="number" name="min" defaultValue={f.minPoints} className="field" placeholder="e.g. 2000" /></div>
          <div><label className="label" htmlFor="max">Max points in range</label><input id="max" type="number" name="max" defaultValue={f.maxPoints} className="field" /></div>
          <div><label className="label" htmlFor="q">Search name / phone / code</label><input id="q" name="q" defaultValue={f.q} className="field" /></div>
          <div><label className="label" htmlFor="sangh">Sangh</label><input id="sangh" name="sangh" defaultValue={f.sangh} className="field" /></div>
          <div><label className="label" htmlFor="residence">Residence</label><input id="residence" name="residence" defaultValue={f.residence} className="field" /></div>
          <div><label className="label" htmlFor="village">Village</label><input id="village" name="village" defaultValue={f.village} className="field" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="ageMin">Age from</label><input id="ageMin" type="number" name="ageMin" min={0} defaultValue={f.ageMin} className="field" /></div>
            <div><label className="label" htmlFor="ageMax">Age to</label><input id="ageMax" type="number" name="ageMax" min={0} defaultValue={f.ageMax} className="field" /></div>
          </div>
          <div><label className="label" htmlFor="pathshala">Pathshala</label>
            <select id="pathshala" name="pathshala" defaultValue={f.pathshala} className="field"><option value="">Any</option><option value="yes">Yes</option><option value="no">No</option></select></div>
          <div><label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={f.status} className="field"><option value="">Any</option><option value="active">Active</option><option value="inactive">Deactivated</option></select></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-gold">Apply filters</button>
          <Link href="/admin/students" className="btn btn-ghost">Reset</Link>
          <a href={`/admin/students/export?${exportQs}`} className="btn btn-ghost sm:ml-auto">⬇ Export CSV ({total})</a>
        </div>
      </form>

      <p className="text-sm text-muted"><b>{total}</b> student{total === 1 ? "" : "s"} · points counted for <b>{range}</b> (daily logs + bonuses)</p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-gold-50 text-xs uppercase tracking-wide text-gold-700">
            <tr>
              <th className="p-3"><Link href={sortLink("name")}>Student{arrow("name")}</Link></th>
              <th className="p-3"><Link href={sortLink("age")}>Age{arrow("age")}</Link></th>
              <th className="p-3"><Link href={sortLink("sangh")}>Sangh{arrow("sangh")}</Link></th>
              <th className="p-3"><Link href={sortLink("residence")}>Residence{arrow("residence")}</Link></th>
              <th className="p-3">Village</th>
              <th className="p-3">Phone</th>
              <th className="p-3 text-right"><Link href={sortLink("days")}>Days{arrow("days")}</Link></th>
              <th className="p-3 text-right"><Link href={sortLink("points")}>Points{arrow("points")}</Link></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {rows.map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="p-3">
                  <Link href={`/admin/students/${r.id}`} className="flex items-center gap-2 font-semibold text-gold-700 hover:underline">
                    <Avatar photoKey={r.photo_key} name={`${r.first_name} ${r.surname}`} size={34} />
                    {r.first_name} {r.surname}{!r.active && <span className="ml-1 rounded bg-red-100 px-1.5 text-[10px] text-danger">OFF</span>}
                  </Link>
                </td>
                <td className="p-3">{r.age}</td>
                <td className="max-w-[14rem] truncate p-3" title={r.sangh}>{r.sangh}</td>
                <td className="p-3">{r.residence}</td>
                <td className="p-3">{r.village}</td>
                <td className="p-3 tabular-nums">{r.father_phone || r.mother_phone || r.own_phone}</td>
                <td className="p-3 text-right tabular-nums">{r.active_days}</td>
                <td className="p-3 text-right num text-lg text-gold-900">{r.points}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted">No students match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn btn-ghost min-h-10" href={link({ page: String(page - 1) })}>← Prev</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn-ghost min-h-10" href={link({ page: String(page + 1) })}>Next →</Link>}
        </div>
      )}
    </div>
  );
}
