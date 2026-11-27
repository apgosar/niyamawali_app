/* eslint-disable @next/next/no-img-element */

export interface TopRow {
  rank: number;
  name: string;
  photoKey: string;
}

const MEDAL = ["🥇", "🥈", "🥉"];

/**
 * The "Top 3 of the month" picture. 360px wide: shown on the results page and exported as the image
 * the admin posts to WhatsApp. Always bilingual so the same picture works for everyone.
 */
export function TopThreeCard({ monthEn, monthGu, rows, donor }: { monthEn: string; monthGu: string; rows: TopRow[]; donor?: string | null }) {
  return (
    <div className="relative flex min-h-[450px] w-[360px] flex-col items-center bg-cream px-8 pb-6 pt-7 text-center">
      <div className="pointer-events-none absolute inset-2 rounded-lg border-[3px] border-gold-300" />
      <div className="pointer-events-none absolute inset-[14px] rounded-md border border-gold-300" />

      <img src="/icons/icon-192.png" alt="" width={60} height={60} className="rounded-full" />
      <p className="font-display mt-1 text-lg font-bold text-gold-700">Divine Sanskar Shibir</p>
      <p className="text-[11px] tracking-widest text-gold-600">NIYAMAWALI · નિયમાવલી</p>

      <h2 className="font-display mt-3 text-2xl font-bold text-gold-900">Top 3 · ટોપ ૩</h2>
      <p className="text-sm font-semibold text-gold-700">{monthEn}</p>
      <p className="text-sm font-semibold text-gold-700">{monthGu}</p>

      <ol className="mt-4 w-full space-y-3">
        {rows.map((r) => (
          <li key={`${r.rank}-${r.name}`} className="flex items-center gap-3 rounded-2xl border border-gold-300 bg-ivory px-3 py-2 text-left shadow-soft">
            <span className="text-3xl">{MEDAL[r.rank - 1] ?? r.rank}</span>
            <img src={`/api/photo/${r.photoKey}`} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full border-2 border-gold-300 object-cover" />
            <span className="font-display min-w-0 flex-1 text-xl font-bold leading-tight text-gold-900">{r.name}</span>
          </li>
        ))}
      </ol>

      <p className="mt-auto whitespace-pre-line pt-4 text-center text-[11px] leading-snug text-gold-700">{donor ? `🪔 ${donor}` : "🪷"}</p>
    </div>
  );
}
