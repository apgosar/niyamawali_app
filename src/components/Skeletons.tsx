/**
 * Placeholders shown the instant a tab or link is tapped, while the real page is fetched.
 * They contain no text on purpose, so they are the same in Gujarati and English and need no server data.
 */

const sk = "skeleton";

/** Student screens (Today / Progress / Profile / …): a header band, a stats card and a list of cards. */
export function StudentSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <div className="safe-top rounded-b-[2rem] border-b border-gold-100 bg-gradient-to-b from-peach/70 via-gold-50 to-cream px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <div className={`${sk} h-10 w-10 !rounded-full`} />
          <div className={`${sk} h-5 w-32`} />
          <div className={`${sk} ml-auto h-9 w-24 !rounded-full`} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className={`${sk} h-11 w-11 !rounded-full`} />
          <div className="space-y-2">
            <div className={`${sk} h-3 w-24`} />
            <div className={`${sk} h-5 w-40`} />
          </div>
        </div>
        <div className={`${sk} mt-4 h-32 w-full !rounded-2xl`} />
      </div>
      <div className="space-y-2.5 px-4 pt-4">
        <div className="flex gap-2">
          <div className={`${sk} h-10 w-20 !rounded-full`} />
          <div className={`${sk} h-10 w-24 !rounded-full`} />
          <div className={`${sk} h-10 w-20 !rounded-full`} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${sk} h-16 w-full !rounded-2xl`} />
        ))}
      </div>
    </div>
  );
}

/** Admin screens: a title and a few blocks under the (already visible) admin menu. */
export function AdminSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${sk} h-24 !rounded-2xl`} />
        ))}
      </div>
      <div className={`${sk} h-56 w-full !rounded-2xl`} />
      <div className={`${sk} h-40 w-full !rounded-2xl`} />
    </div>
  );
}

/** A centred card, for pages without the student header (results). */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="mx-auto max-w-md space-y-4 px-4 pt-6">
      <div className={`${sk} mx-auto h-8 w-56`} />
      <div className={`${sk} h-[420px] w-full !rounded-2xl`} />
      <div className={`${sk} h-36 w-full !rounded-2xl`} />
    </div>
  );
}
