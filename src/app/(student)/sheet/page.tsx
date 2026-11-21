import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { addMonths, monthLabel, monthOf, todayIST } from "@/lib/dates";
import { buildSheet, parsePart, sheetMonth } from "@/lib/sheet";
import { SheetView } from "./SheetView";

export const metadata = { title: "Printable sheet" };

export default async function SheetPage({ searchParams }: { searchParams: Promise<{ month?: string; part?: string }> }) {
  const student = await requireStudent();
  const { lang, t } = await getT();
  const sp = await searchParams;
  const cur = monthOf(todayIST());
  const month = sheetMonth(sp.month, cur);
  const part = parsePart(sp.part);
  const data = await buildSheet(month, part, lang);
  const options = [...new Set([addMonths(cur, -1), cur, addMonths(cur, 1), month])].sort().map((m) => ({ value: m, label: monthLabel(m, lang) }));

  return (
    <main className="safe-top px-4 pb-8 pt-4">
      <Link href="/profile" className="text-sm font-semibold text-gold-600">← {t.common.back}</Link>
      <h1 className="mb-1 mt-2 text-3xl font-bold text-gold-700">{t.sheet.title}</h1>
      <p className="mb-4 text-sm text-muted">{t.sheet.help}</p>
      <SheetView data={data} studentName={`${student.first_name} ${student.surname}`} studentCode={student.student_code} months={options} />
    </main>
  );
}
