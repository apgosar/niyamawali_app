import Image from "next/image";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Image src="/icons/icon-192.png" alt="" width={112} height={112} className="rounded-full" priority />
      <h1 className="text-2xl font-semibold text-gold-700">You are offline · તમે ઑફલાઇન છો</h1>
      <p className="text-muted">Please check your internet connection and open the app again.</p>
      <p className="text-muted">ઇન્ટરનેટ ચાલુ કરીને ઍપ ફરી ખોલો.</p>
    </main>
  );
}
