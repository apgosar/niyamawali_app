import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { adminLogout } from "../actions";
import { AdminNav } from "./AdminNav";

export const metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="safe-top flex items-center gap-3 py-4">
        <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-full" />
        <div className="flex-1">
          <p className="font-display text-xl font-bold leading-tight text-gold-700">Niyamawali Admin</p>
          <p className="text-xs text-muted">Signed in as {admin.name}</p>
        </div>
        <form action={adminLogout}><button className="btn btn-ghost min-h-10 px-3 py-1.5 text-sm">Sign out</button></form>
      </header>
      <AdminNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}
