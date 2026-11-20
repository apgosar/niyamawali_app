/* eslint-disable @next/next/no-img-element */
export function Avatar({
  photoKey, name, size = 44, className = "",
}: { photoKey?: string | null; name: string; size?: number; className?: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return photoKey ? (
    <img
      src={`/api/photo/${photoKey}`}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 rounded-full border-2 border-gold-300 bg-sand object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-gold-300 bg-sand font-semibold text-gold-700 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
