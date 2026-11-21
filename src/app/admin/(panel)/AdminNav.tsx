"use client";
import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/unlock", label: "Unlock edits" },
  { href: "/admin/leaderboard", label: "Leaderboard" },
  { href: "/admin/niyams", label: "Niyams" },
  { href: "/admin/donors", label: "Donors" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/admins", label: "Admins" },
];

function Pill({ label, on }: { label: string; on: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-gold-500 text-white" : "border border-gold-100 bg-ivory text-gold-700"}`}>
      {label}
      {pending && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
    </span>
  );
}

export function AdminNav() {
  const path = usePathname();
  // The tapped menu item lights up straight away; `from` hands control back once the new page has loaded.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 border-b border-gold-100 pb-3">
        {links.map((l) => {
          const active = isActive(l.href);
          const on = tapped && tapped.from === path ? tapped.href === l.href : active;
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={active ? "page" : undefined} className="block active:scale-95 transition-transform"
                onClick={() => setTapped({ href: l.href, from: path })}>
                <Pill label={l.label} on={on} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
