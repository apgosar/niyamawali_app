import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { addMonths, monthLabel, monthOf, todayIST } from "@/lib/dates";
import { awardTop10, donorFor, monthlyLeaderboard } from "@/lib/leaderboard";
import { Avatar } from "@/components/Avatar";
import { DonorBanner } from "@/components/DonorBanner";

export const metadata = { title: "Leaderboard" };
const MEDAL = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const student = await requireStudent();
  const { t, lang } = await getT();
  const { m } = await searchParams;
  const current = monthOf(todayIST());
  const prev = addMonths(current, -1);
  const month = m === "prev" ? prev : current;

  if (month < current) await awardTop10(month); // closed month → hand out Top-10 badges

  const [rows, donor] = await Promise.all([monthlyLeaderboard(month, 100), donorFor(month)]);
  const me = rows.find((r) => r.id === student.id) ?? null;
  const top3 = rows.filter((r) => r.rank <= 3).slice(0, 3);
  const rest = rows.filter((r) => !top3.includes(r));
  // podium order: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-16" };

  const tab = (active: boolean) =>
    `flex-1 rounded-full py-2 text-center text-sm font-semibold transition ${active ? "bg-gold-500 text-white shadow-sm" : "text-gold-700"}`;

  return (
    <>
      <header className="safe-top rounded-b-[2rem] border-b border-gold-100 bg-gradient-to-b from-peach/70 via-gold-50 to-cream px-4 pb-4 pt-5">
        <h1 className="text-center text-3xl font-bold text-gold-700">{t.board.title}</h1>
        <p className="mt-1 text-center text-sm text-muted">{monthLabel(month, lang)}</p>
        <div className="mx-auto mt-3 flex max-w-xs gap-1 rounded-full border border-gold-300 bg-ivory p-1">
          <Link href="/leaderboard" replace className={tab(month === current)}>{t.board.thisMonth}</Link>
          <Link href="/leaderboard?m=prev" replace className={tab(month === prev)}>{t.board.lastMonth}</Link>
        </div>
        {donor && (
          <div className="mt-3">
            <DonorBanner label={t.board.sponsorTitle}
              donor={{ name: donor.name, photo_key: donor.photo_key, message: (lang === "gu" ? donor.message_gu : donor.message_en) || donor.message_gu || donor.message_en }} />
          </div>
        )}
      </header>

      <main className="px-4 pt-5">
        {rows.length === 0 ? (
          <p className="card p-8 text-center text-muted">{t.board.empty}</p>
        ) : (
          <>
            <ol className="mb-5 grid grid-cols-3 items-end gap-2">
              {podium.map((r) => (
                <li key={r.id} className="fade-up flex flex-col items-center text-center">
                  <div className="relative">
                    {r.rank === 1 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl">👑</span>}
                    <Avatar photoKey={r.photo_key} name={`${r.first_name} ${r.surname}`} size={r.rank === 1 ? 72 : 58} />
                  </div>
                  <p className={`mt-1 line-clamp-2 text-xs font-semibold leading-tight ${r.id === student.id ? "text-sage-700" : ""}`}>{r.first_name} {r.surname}</p>
                  <div className={`mt-1 flex w-full flex-col items-center justify-start rounded-t-2xl border border-gold-300 bg-gradient-to-b from-gold-100 to-gold-50 pt-2 ${heights[r.rank] ?? "h-14"}`}>
                    <span className="text-xl">{MEDAL[r.rank - 1]}</span>
                    <span className="font-display text-lg font-bold text-gold-900">{r.points}</span>
                  </div>
                </li>
              ))}
            </ol>

            <ul className="space-y-2">
              {rest.map((r) => {
                const mine = r.id === student.id;
                return (
                  <li key={r.id} className={`flex items-center gap-3 rounded-2xl border p-2.5 ${mine ? "border-sage-500 bg-sage-50" : "border-gold-100 bg-ivory"}`}>
                    <span className="w-8 text-center font-display text-lg font-bold text-gold-600">{r.rank}</span>
                    <Avatar photoKey={r.photo_key} name={`${r.first_name} ${r.surname}`} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{r.first_name} {r.surname}</span>
                      <span className="block truncate text-xs text-muted">{r.sangh}</span>
                    </span>
                    <span className="font-display text-xl font-bold text-gold-900">{r.points}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* own position pinned above the nav when not visible in the list */}
        {month === current && (
          <div className="fixed inset-x-0 bottom-[4.6rem] z-30 mx-auto max-w-md px-4">
            <div className="flex items-center gap-3 rounded-2xl border-2 border-sage-500 bg-sage-50 p-2.5 shadow-lg">
              <Avatar photoKey={student.photo_key} name={student.first_name} size={40} />
              {me ? (
                <>
                  <span className="flex-1 font-semibold text-sage-700">{t.board.yourRank}: <span className="font-display text-xl">#{me.rank}</span></span>
                  <span className="font-display text-xl font-bold text-gold-900">{me.points} <span className="text-xs">{t.board.pointsSuffix}</span></span>
                </>
              ) : (
                <span className="flex-1 text-sm font-semibold text-sage-700">{t.board.notRanked}</span>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
