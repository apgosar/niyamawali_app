"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";

const items = [
  { href: "/", key: "today", icon: "🪷" },
  { href: "/leaderboard", key: "leaderboard", icon: "🏆" },
  { href: "/progress", key: "progress", icon: "📈" },
  { href: "/profile", key: "profile", icon: "👤" },
] as const;

export function BottomNav() {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gold-100 bg-ivory/95 backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors ${active ? "text-gold-600" : "text-muted"}`}>
                <span className={`flex h-8 w-14 items-center justify-center rounded-full text-xl transition-colors ${active ? "bg-gold-100" : ""}`}>{it.icon}</span>
                {t.nav[it.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
