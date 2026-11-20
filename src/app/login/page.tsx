import { redirect } from "next/navigation";
import { getStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { BrandHeader } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Login" };

export default async function LoginPage() {
  if (await getStudent()) redirect("/");
  const { t } = await getT();
  return (
    <main className="mx-auto max-w-md pb-10">
      <BrandHeader title={t.appName} subtitle={t.tagline} />
      <LoginForm />
    </main>
  );
}
