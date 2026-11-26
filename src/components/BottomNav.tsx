"use client";
import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";

const items = [
  { href: "/", key: "today", icon: "🪷" },
  { href: "/progress", key: "progress", icon: "📈" },
  { href: "/rules", key: "rules", icon: "📜" },
  { href: "/profile", key: "profile", icon: "👤" },
] as const;

/** Inside a <Link>: knows whether this link's navigation is still in progress. */
function Tab({ icon, label, on }: { icon: string; label: string; on: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span className={`flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${on ? "text-gold-600" : "text-muted"}`}>
      <span className={`flex h-8 w-14 items-center justify-center rounded-full text-xl transition-colors ${on ? "bg-gold-100" : ""}`}>
        {pending ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" /> : icon}
      </span>
      {label}
    </span>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { t } = useI18n();
  // The tapped tab lights up immediately, before the new page has arrived. `from` ties it to the page we left,
  // so once the path changes the real location takes over again.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  const current = items.find((it) => (it.href === "/" ? path === "/" : path.startsWith(it.href)))?.href ?? null;
  const shown = tapped && tapped.from === path ? tapped.href : current;

  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gold-100 bg-ivory shadow-[0_-4px_14px_-8px_rgba(120,80,20,0.25)]">
      <ul className="mx-auto grid h-[var(--nav-body)] max-w-md grid-cols-4">
        {items.map((it) => (
          <li key={it.href} className="h-full">
            <Link href={it.href} aria-current={current === it.href ? "page" : undefined} className="flex h-full items-center justify-center transition-transform active:scale-95"
              onClick={() => setTapped({ href: it.href, from: path })}>
              <Tab icon={it.icon} label={t.nav[it.key]} on={shown === it.href} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
