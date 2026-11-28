import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { isValidMonth, monthLabel, monthOf, todayIST } from "@/lib/dates";
import { currentDonor } from "@/lib/leaderboard";
import { getMonthTotal } from "@/lib/logs";
import { donorLines } from "@/lib/donor";
import { CertificateView } from "./CertificateView";

export const metadata = { title: "Certificate" };

export default async function CertificatePage({ params }: { params: Promise<{ month: string }> }) {
  const student = await requireStudent();
  const { t, lang } = await getT();
  const { month } = await params;
  if (!isValidMonth(month)) notFound();
  const closed = month < monthOf(todayIST());

  const [points, donor] = closed ? await Promise.all([getMonthTotal(student.id, month), currentDonor()]) : [0, null];

  return (
    <main className="safe-top px-4 pb-6 pt-5">
      <Link href="/progress" className="text-sm font-semibold text-gold-600">← {t.common.back}</Link>
      {!closed || points <= 0 ? (
        <p className="card mt-6 p-8 text-center text-muted">{closed ? t.progress.noData : t.progress.certificateHint}</p>
      ) : (
        <CertificateView
          name={`${student.first_name} ${student.surname}`}
          photoKey={student.photo_key}
          monthText={monthLabel(month, lang)}
          points={points}
          donor={donor ? donorLines(donor, lang).join("\n") : null}
          fileName={`niyamawali-${month}-${student.first_name}`}
        />
      )}
    </main>
  );
}
