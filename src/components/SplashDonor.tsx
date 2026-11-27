/* eslint-disable @next/next/no-img-element */
import { getT } from "@/lib/lang";
import { currentDonor } from "@/lib/leaderboard";
import { donorLines } from "@/lib/donor";
import { DonorName } from "./DonorBanner";

/** The current donor, shown inside the opening screen. Renders nothing when there is no donor. */
export async function SplashDonor() {
  const { lang, t } = await getT();
  const donor = await currentDonor();
  if (!donor) return null;
  const message = (lang === "gu" ? donor.message_gu : donor.message_en) || donor.message_gu || donor.message_en;
  return (
    <div className="overflow-hidden rounded-3xl border border-gold-300 bg-ivory/90 shadow-soft">
      {donor.photo_key && (
        // large photo; when it is taller than the space, the TOP is cut off so that the people stay in view
        <img data-donor-photo src={`/api/photo/${donor.photo_key}`} alt="" fetchPriority="high"
          className="block aspect-[4/3] max-h-[38dvh] w-full object-cover object-bottom" />
      )}
      <div className="p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-600">{t.today.sponsored}:</p>
        {!donor.photo_key && <p className="mt-1 text-4xl">🪔</p>}
        <p className="mt-1"><DonorName lines={donorLines(donor, lang)} large /></p>
        {message && <p className="mt-1 text-sm leading-snug text-ink/80">{message}</p>}
      </div>
    </div>
  );
}
