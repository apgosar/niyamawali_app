import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { one } from "@/lib/db";
import { EditForm } from "./EditForm";

export const metadata = { title: "Edit details" };

export default async function EditProfilePage() {
  const student = await requireStudent();
  const { t } = await getT();
  const d = await one<Record<string, string | boolean | null>>(
    `select village, father_name, father_phone, mother_name, mother_phone, own_phone, residence, sangh,
            dharmik_abhyas, pathshala, pathshala_name from students where id = $1`,
    [student.id],
  );
  const initial = Object.fromEntries(Object.entries(d ?? {}).map(([k, v]) => [k, k === "pathshala" ? (v ? "yes" : "no") : (v ?? "")])) as Record<string, string>;
  return (
    <main className="safe-top px-4 pt-5">
      <Link href="/profile" className="text-sm font-semibold text-gold-600">← {t.common.back}</Link>
      <h1 className="mb-4 mt-2 text-3xl font-bold text-gold-700">{t.profile.details}</h1>
      <EditForm initial={initial} photoKey={student.photo_key} />
    </main>
  );
}
