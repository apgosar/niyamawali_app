/* eslint-disable @next/next/no-img-element */
import { getT } from "@/lib/lang";
import { currentDonor } from "@/lib/leaderboard";

/** The current donor, shown inside the opening screen. Renders nothing when there is no donor. */
export async function SplashDonor() {
  const { lang, t } = await getT();
  const donor = await currentDonor();
  if (!donor) return null;
  const message = (lang === "gu" ? donor.message_gu : donor.message_en) || donor.message_gu || donor.message_en;
  return (
    <div className="rounded-3xl border border-gold-300 bg-ivory/90 p-5 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-600">{t.today.sponsored}</p>
      {donor.photo_key ? (
        <img src={`/api/photo/${donor.photo_key}`} alt="" width={96} height={96}
          className="mx-auto mt-3 h-24 w-24 rounded-full border-[3px] border-gold-300 object-cover shadow-soft" />
      ) : (
        <p className="mt-2 text-5xl">🪔</p>
      )}
      <p className="font-display mt-3 text-2xl font-bold leading-tight text-gold-900">{donor.name}</p>
      {message && <p className="mt-1 text-sm leading-snug text-ink/80">{message}</p>}
    </div>
  );
}
