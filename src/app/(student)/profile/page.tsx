import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { getBadges } from "@/lib/logs";
import { referralsOf } from "@/lib/referrals";
import { getSettings } from "@/lib/settings";
import { BADGES } from "@/lib/badges";
import { Avatar } from "@/components/Avatar";
import { LangToggle } from "@/components/LangToggle";
import { fmt } from "@/i18n";
import { ReferralCard } from "./ReferralCard";
import { InstallCard, LogoutButton } from "./ProfileActions";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const student = await requireStudent();
  const { t, lang } = await getT();
  const [earned, referrals, settings] = await Promise.all([getBadges(student.id), referralsOf(student.id), getSettings()]);
  const have = new Set(earned.map((b) => b.badge_code));
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
        <p className="mt-1 text-xs text-muted">{fmt(t.profile.memberSince, { date: since })}</p>
      </header>

      <main className="space-y-5 px-4 pt-5">
        <section className="card p-4">
          <h2 className="text-lg font-bold text-gold-700">{t.profile.badges}</h2>
          <p className="hint mb-3">{t.profile.badgesHint}</p>
          <ul className="grid grid-cols-3 gap-2.5">
            {BADGES.map((b) => {
              const got = have.has(b.code);
              return (
                <li key={b.code} className={`rounded-2xl border p-2.5 text-center ${got ? "border-gold-300 bg-gold-50" : "border-gold-100 bg-sand/40"}`}>
                  <span className={`block text-3xl ${got ? "" : "opacity-25 grayscale"}`}>{b.icon}</span>
                  <span className={`mt-1 block text-[11px] font-bold leading-tight ${got ? "text-gold-900" : "text-muted"}`}>{b.name[lang]}</span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-muted">{b.desc[lang]}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <ReferralCard code={student.referral_code} bonus={settings.referralBonus} days={settings.referralUnlockDays}
          referrals={referrals.map((r) => ({ name: `${r.first_name} ${r.surname}`, status: r.status }))} />

        <InstallCard />

        <section className="card divide-y divide-gold-100">
          <Link href="/profile/edit" className="flex items-center justify-between p-4 font-semibold text-gold-700">
            <span>✏️ {t.profile.details}</span><span aria-hidden>›</span>
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
