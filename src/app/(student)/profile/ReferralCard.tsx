"use client";
import { useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/I18nProvider";

interface Props {
  code: string;
  bonus: number;
  days: number;
  referrals: { name: string; status: string }[];
}

export function ReferralCard({ code, bonus, days, referrals }: Props) {
  const { t, f, n } = useI18n();
  const [copied, setCopied] = useState(false);
  // Browser-only values, read without setState-in-effect (server render gets the fallbacks).
  const none = () => () => {};
  const origin = useSyncExternalStore(none, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(none, () => typeof navigator.share === "function", () => false);
  const link = `${origin}/register?ref=${code}`;

  const text = f(t.profile.shareText, { code, link, bonus: n(bonus), days: n(days) });

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = value; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="card overflow-hidden">
      <div className="bg-gradient-to-br from-lotus-50 via-ivory to-gold-50 p-4">
        <h2 className="text-lg font-bold text-lotus-600">🎁 {t.profile.referral}</h2>
        <p className="mt-1 text-sm">{f(t.profile.referralHelp, { bonus: n(bonus), days: n(days) })}</p>

        <p className="label mt-4">{t.profile.yourCode}</p>
        <button type="button" onClick={() => copy(code)}
          className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-gold-300 bg-white px-4 py-3 active:scale-[.99]">
          <span className="font-mono text-3xl font-bold tracking-[0.3em] text-gold-700">{code}</span>
          <span className="text-sm font-semibold text-gold-600">{copied ? t.common.copied : t.common.copy}</span>
        </button>

        <div className="mt-3 grid gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener"
            className="btn bg-[#25D366] text-white shadow-soft">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11.600 11.600 0 0 1-4.800-4.200c-.4-.5-1.100-1.500-1.100-2.800 0-1.300.7-1.900.9-2.200.2-.2.5-.3.700-.3h.5c.2 0 .4 0 .6.500l.9 2.100c.1.200.1.400 0 .600l-.4.600c-.2.200-.3.400-.1.700.2.300.8 1.300 1.700 2.100 1.100 1 2.100 1.300 2.400 1.500.3.100.5.100.7-.1l1-1.200c.2-.3.400-.2.700-.1l2 .9c.3.200.5.200.6.300.1.200.1.800-.1 1.400Z" /></svg>
            {t.profile.shareWhatsApp}
          </a>
          <div className="grid grid-cols-2 gap-2">
            {canShare && (
              <button type="button" className="btn btn-ghost" onClick={() => navigator.share({ title: t.appName, text, url: link }).catch(() => {})}>{t.profile.shareOther}</button>
            )}
            <button type="button" className={`btn btn-ghost ${canShare ? "" : "col-span-2"}`} onClick={() => copy(link)}>{copied ? t.common.copied : t.profile.copyLink}</button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="mb-2 text-sm font-bold text-gold-700">{t.profile.invited}</h3>
        {referrals.length === 0 ? <p className="text-sm text-muted">{t.profile.noInvites}</p> : (
          <ul className="space-y-1.5">
            {referrals.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.status === "awarded" ? "bg-sage-500 text-white" : "bg-gold-100 text-gold-700"}`}>
                  {r.status === "awarded" ? f(t.profile.awarded, { n: n(bonus) }) : t.profile.pending}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
