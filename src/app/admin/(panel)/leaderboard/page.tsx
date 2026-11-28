import Link from "next/link";
import { monthOf, monthLabel, todayIST, isValidMonth, addMonths } from "@/lib/dates";
import { awardTop10, currentDonor, monthlyLeaderboard } from "@/lib/leaderboard";
import { donorLines } from "@/lib/donor";
import { Avatar } from "@/components/Avatar";
import { ResultsPanel } from "./ResultsPanel";

export const metadata = { title: "Leaderboard" };

export default async function AdminLeaderboard({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: m } = await searchParams;
  const cur = monthOf(todayIST());
  const month = m && isValidMonth(m) ? m : cur;
  const closed = month < cur;
  if (closed) await awardTop10(month);
  const [rows, donor] = await Promise.all([monthlyLeaderboard(month, 200), currentDonor()]);
  const top = rows.filter((r) => r.rank <= 3).slice(0, 5).map((r) => ({ rank: r.rank, name: `${r.first_name} ${r.surname}`, photoKey: r.photo_key }));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <form method="get" className="flex items-end gap-2">
          <div><label className="label" htmlFor="month">Month</label><input id="month" name="month" type="month" defaultValue={month} className="field" /></div>
          <button className="btn btn-gold">Show</button>
        </form>
        <Link href={`/admin/leaderboard?month=${addMonths(month, -1)}`} className="btn btn-ghost">‹ Previous</Link>
        <a href={`/admin/leaderboard/export?month=${month}`} className="btn btn-ghost sm:ml-auto">⬇ Export CSV</a>
      </div>
      <h1 className="text-2xl font-bold text-gold-700">{monthLabel(month, "en")}</h1>
      <p className="text-sm text-muted">
        Rankings are visible to admins only; students see just their own points. Students who have not attended a previous
        Divine Sanskar Shibir are not ranked.
      </p>

      {closed && (
        <ResultsPanel key={month} month={month} monthEn={monthLabel(month, "en")} monthGu={monthLabel(month, "gu")} rows={top} donor={donor ? ["Labharthi Parivaar:", ...donorLines(donor, "en")].join("\n") : null} />
      )}
      {!closed && <p className="rounded-xl bg-gold-50 p-3 text-sm text-gold-700">The Top 3 picture and the students’ results link appear once the month has ended.</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-gold-50 text-left text-xs uppercase tracking-wide text-gold-700"><tr><th className="p-3">Rank</th><th className="p-3">Student</th><th className="p-3">ID</th><th className="p-3">Sangh</th><th className="p-3 text-right">Points</th></tr></thead>
          <tbody className="divide-y divide-gold-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3 num text-lg text-gold-600">{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
                <td className="p-3"><Link href={`/admin/students/${r.id}`} className="flex items-center gap-2 font-semibold hover:underline"><Avatar photoKey={r.photo_key} name={r.first_name} size={32} />{r.first_name} {r.surname}</Link></td>
                <td className="p-3 num text-sm text-muted">{r.student_code}</td>
                <td className="p-3">{r.sangh}</td>
                <td className="p-3 text-right num text-lg">{r.points}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">No ranked students for this month.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
