import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { referralsOf } from "@/lib/referrals";
import { getSettings } from "@/lib/settings";
import { Avatar } from "@/components/Avatar";
import { LinkSpinner } from "@/components/LinkSpinner";
import { LangToggle } from "@/components/LangToggle";
import { fmt } from "@/i18n";
import { ReferralCard } from "./ReferralCard";
import { InstallCard, LogoutButton } from "./ProfileActions";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const student = await requireStudent();
  const { t, lang } = await getT();
  const [referrals, settings] = await Promise.all([referralsOf(student.id), getSettings()]);
  const name = `${student.first_name} ${student.surname}`;
  const since = new Date(student.created_at).toLocaleDateString(lang === "gu" ? "gu-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

  return (
    <>
      <header className="safe-top rounded-b-[2rem] border-b border-gold-100 bg-gradient-to-b from-peach/70 via-gold-50 to-cream px-4 pb-6 pt-5 text-center">
        <div className="mb-1 flex justify-end"><LangToggle /></div>
        <div className="mx-auto w-fit rounded-full p-1 shadow-[0_0_40px_-6px_rgba(212,175,97,0.9)]">
          <Avatar photoKey={student.photo_key} name={name} size={104} />
        </div>
        <h1 className="mt-3 text-3xl font-bold text-gold-900">{name}</h1>
        <p className="text-sm text-muted">{student.village} · {student.sangh}</p>
        <p className="mt-1 text-sm font-semibold text-muted">{t.lock.studentId}: <span className="num rounded-full bg-gold-100 px-2.5 py-0.5 text-gold-700">{student.student_code}</span></p>
        <p className="mt-1 text-xs text-muted">{fmt(t.profile.memberSince, { date: since })}</p>
      </header>

      <main className="space-y-5 px-4 pt-5">
        {settings.referralsEnabled && (
          <ReferralCard code={student.referral_code} bonus={settings.referralBonus} days={settings.referralUnlockDays}
            referrals={referrals.map((r) => ({ name: `${r.first_name} ${r.surname}`, status: r.status }))} />
        )}

        <InstallCard />

        <section className="card divide-y divide-gold-100">
          <Link href="/sheet" className="flex items-center justify-between p-4 font-semibold text-gold-700">
            <span>🖨️ {t.sheet.menu}<span className="block text-xs font-normal text-muted">{t.sheet.menuHelp}</span></span><span className="flex items-center gap-2 text-gold-600"><LinkSpinner /><span aria-hidden>›</span></span>
          </Link>
          <Link href="/profile/edit" className="flex items-center justify-between p-4 font-semibold text-gold-700">
            <span>✏️ {t.profile.details}</span><span className="flex items-center gap-2 text-gold-600"><LinkSpinner /><span aria-hidden>›</span></span>
          </Link>
          <div className="flex items-center justify-between p-4">
            <span className="font-semibold text-gold-700">🌐 {t.profile.language}</span>
            <LangToggle />
          </div>
          <LogoutButton />
        </section>
      </main>
    </>
  );
}
