import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { AdminLoginForm } from "../forms";

export const metadata = { title: "Admin login" };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="mx-auto max-w-sm px-5 py-12">
      <Image src="/icons/icon-192.png" alt="" width={96} height={96} priority className="mx-auto rounded-full shadow-[0_0_40px_-8px_rgba(212,175,97,0.8)]" />
      <h1 className="mb-1 mt-4 text-center text-3xl font-bold text-gold-700">Niyamawali Admin</h1>
      <p className="mb-6 text-center text-sm text-muted">Divine Sanskar Shibir</p>
      <AdminLoginForm />
    </main>
  );
}
