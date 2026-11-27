import { redirect } from "next/navigation";
import { getStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { query } from "@/lib/db";
import { findReferrer, normalizeCode } from "@/lib/referrals";
import { getSettings } from "@/lib/settings";
import { listVillages } from "@/lib/villages";
import { listSanghs } from "@/lib/sanghs";
import { BrandHeader } from "@/components/Brand";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Register" };

async function residenceSuggestions() {
  const rows = await query<{ v: string }>(
    "select residence as v from students group by residence order by count(*) desc, residence limit 40",
  );
  return rows.map((r) => r.v);
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if (await getStudent()) redirect("/");
  const { t } = await getT();
  const { ref } = await searchParams;
  const code = normalizeCode(ref);
  const settings = await getSettings();
  const [referrer, sangh, residence, village] = await Promise.all([
    code && settings.referralsEnabled ? findReferrer(code) : null,
    listSanghs(),
    residenceSuggestions(),
    listVillages(),
  ]);

  return (
    <main className="mx-auto max-w-md pb-16">
      <BrandHeader title={t.register.title} subtitle={t.register.subtitle} />
      <RegisterForm
        refCode={referrer ? code : ""}
        badRef={settings.referralsEnabled && !!code && !referrer}
        referrerName={referrer ? `${referrer.first_name} ${referrer.surname}` : null}
        bonus={settings.referralBonus}
        suggestions={{ sangh, residence, village }}
      />
    </main>
  );
}
