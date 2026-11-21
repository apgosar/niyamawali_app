import { redirect } from "next/navigation";
import { getStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { safeNext } from "@/lib/nav";
import { BrandHeader } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getStudent()) redirect(safeNext(next));
  const { t } = await getT();
  return (
    <main className="mx-auto max-w-md pb-10">
      <BrandHeader title={t.appName} subtitle={t.tagline} />
      <LoginForm next={safeNext(next)} />
    </main>
  );
}
