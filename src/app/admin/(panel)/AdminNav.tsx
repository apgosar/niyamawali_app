"use client";
import Link from "next/link";
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

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 border-b border-gold-100 pb-3">
        {links.map((l) => {
          const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-gold-500 text-white" : "bg-ivory text-gold-700 border border-gold-100"}`}>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
