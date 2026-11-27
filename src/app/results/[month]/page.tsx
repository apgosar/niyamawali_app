import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { fmt } from "@/i18n";
import { isValidMonth, monthLabel, monthOf, todayIST } from "@/lib/dates";
import { awardTop10, currentDonor, monthlyLeaderboard } from "@/lib/leaderboard";
import { donorLines } from "@/lib/donor";
import { FitToWidth } from "@/components/FitToWidth";
import { TopThreeCard } from "@/components/TopThreeCard";
import { LangToggle } from "@/components/LangToggle";
import { LinkSpinner } from "@/components/LinkSpinner";

export const metadata = { title: "Results" };

/**
 * Opened from the link the admin shares on WhatsApp. Needs a student login (the login page sends the student
 * back here afterwards). Shows the top 3, and ONLY the logged-in student's own points and rank.
 */
export default async function ResultsPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!isValidMonth(month)) notFound();
  const student = await requireStudent(`/results/${month}`);
  const { t, lang } = await getT();
  const closed = month < monthOf(todayIST());

  let top: { rank: number; name: string; photoKey: string }[] = [];
  let mine: { rank: number; points: number } | null = null;
  let total = 0;
  let donorName: string | null = null;

  if (closed) {
    await awardTop10(month); // hand out the Top-10 badge for the closed month (safe to repeat)
    const [rows, donor] = await Promise.all([monthlyLeaderboard(month, 100000), currentDonor()]);
    total = rows.length;
    top = rows.filter((r) => r.rank <= 3).slice(0, 5).map((r) => ({ rank: r.rank, name: `${r.first_name} ${r.surname}`, photoKey: r.photo_key }));
    const me = rows.find((r) => r.id === student.id);
    mine = me ? { rank: me.rank, points: me.points } : null;
    donorName = donor ? [`${t.today.sponsored}:`, ...donorLines(donor, lang)].join("\n") : null;
  }

  return (
    <main className="safe-top mx-auto max-w-md px-4 pb-12 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-gold-600">← {t.results.home}</Link>
        <LangToggle />
      </div>
      <h1 className="mb-4 mt-3 text-center text-3xl font-bold text-gold-700">{fmt(t.results.title, { month: monthLabel(month, lang) })}</h1>

      {!closed ? (
        <p className="card p-8 text-center text-muted">{t.results.notClosed}</p>
      ) : top.length === 0 ? (
        <p className="card p-8 text-center text-muted">{t.results.empty}</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl shadow-soft">
            <FitToWidth width={360}>
              <TopThreeCard monthEn={monthLabel(month, "en")} monthGu={monthLabel(month, "gu")} rows={top} donor={donorName} />
            </FitToWidth>
          </div>

          <section className="card mt-5 p-5 text-center">
            <h2 className="text-lg font-bold text-gold-700">{t.results.yourResult}</h2>
            {mine ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-gold-50 py-3">
                    <p className="num text-4xl text-gold-600">{mine.points}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t.results.points}</p>
                  </div>
                  <div className="rounded-2xl bg-lotus-50 py-3">
                    <p className="num text-4xl text-lotus-600">#{mine.rank}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t.results.rank} · {fmt(t.results.rankOf, { total })}</p>
                  </div>
                </div>
                <Link href={`/certificate/${month}`} className="btn btn-gold mt-4 w-full">🏅 {t.results.certificate} <LinkSpinner /></Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{t.results.noPoints}</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
