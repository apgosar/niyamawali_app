import { redirect } from "next/navigation";
import { getStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { BrandHeader } from "@/components/Brand";
import { ChangePinForm } from "./ChangePinForm";

export const metadata = { title: "New PIN" };

export default async function ChangePinPage() {
  const s = await getStudent();
  if (!s) redirect("/login");
  const { t } = await getT();
  return (
    <main className="mx-auto max-w-md pb-10">
      <BrandHeader title={t.changePin.title} subtitle={t.changePin.help} />
      <ChangePinForm />
    </main>
  );
}
