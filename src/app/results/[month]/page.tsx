import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { fmt } from "@/i18n";
import { isValidMonth, monthLabel, monthOf, todayIST } from "@/lib/dates";
import { awardTop10 } from "@/lib/leaderboard";
import { getMonthTotal } from "@/lib/logs";
import { LangToggle } from "@/components/LangToggle";
import { LinkSpinner } from "@/components/LinkSpinner";

export const metadata = { title: "Results" };

/**
 * Opened from the link the admin sends out after a month ends. Needs a student login (the login page sends the
 * student back here afterwards). Shows ONLY the logged-in student's own points: no names and no ranking.
 */
export default async function ResultsPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!isValidMonth(month)) notFound();
  const student = await requireStudent(`/results/${month}`);
  const { t, lang } = await getT();
  const closed = month < monthOf(todayIST());

  let points = 0;
  if (closed) {
    await awardTop10(month); // hand out the Top-10 badge for the closed month (safe to repeat)
    points = await getMonthTotal(student.id, month);
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
      ) : (
        <section className="card p-5 text-center">
          <h2 className="text-lg font-bold text-gold-700">{t.results.yourResult}</h2>
          {points > 0 ? (
            <>
              <div className="mt-3 rounded-2xl bg-gold-50 py-4">
                <p className="num text-5xl text-gold-600">{points}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t.results.points}</p>
              </div>
              <Link href={`/certificate/${month}`} className="btn btn-gold mt-4 w-full">🏅 {t.results.certificate} <LinkSpinner /></Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">{t.results.noPoints}</p>
          )}
        </section>
      )}
    </main>
  );
}
