import { Avatar } from "./Avatar";

export interface DonorData {
  name: string;
  photo_key: string | null;
  message: string | null;
}

export function DonorBanner({ donor, label }: { donor: DonorData; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-300 bg-gradient-to-r from-gold-50 via-peach/50 to-gold-50 p-3 shadow-soft">
      <div className="flex items-center gap-3">
        {donor.photo_key ? <Avatar photoKey={donor.photo_key} name={donor.name} size={52} /> : <span className="text-4xl">🪔</span>}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-600">{label}</p>
          <p className="font-display line-clamp-2 text-xl font-bold leading-tight text-gold-900">{donor.name}</p>
          {donor.message && <p className="text-sm leading-snug text-ink/80">{donor.message}</p>}
        </div>
      </div>
    </div>
  );
}
