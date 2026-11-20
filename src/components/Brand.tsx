import Image from "next/image";
import { LangToggle } from "./LangToggle";

/** Logo + title block used on the login / register screens. */
export function BrandHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="safe-top relative px-5 pb-2 pt-4 text-center">
      <div className="absolute right-4 top-4"><LangToggle /></div>
      <div className="mx-auto mt-6 w-fit rounded-full p-1 shadow-[0_0_50px_-8px_rgba(212,175,97,0.8)]">
        <Image src="/icons/icon-512.png" alt="Divine Sanskar Shibir" width={132} height={132} priority className="rounded-full" />
      </div>
      <h1 className="mt-4 text-3xl font-semibold text-gold-700">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}
