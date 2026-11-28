import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentForEdit } from "@/lib/student-admin";
import { listVillages } from "@/lib/villages";
import { listSanghs } from "@/lib/sanghs";
import { StudentEditForm } from "./StudentEditForm";

export const metadata = { title: "Edit student" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getStudentForEdit(id);
  if (!s) notFound();
  const initial = Object.fromEntries(
    Object.entries(s)
      .filter(([k]) => k !== "photo_key" && k !== "student_code")
      .map(([k, v]) => [k, k === "pathshala" ? (v ? "yes" : "no") : String(v ?? "")]),
  );
  const [villages, sanghs] = await Promise.all([listVillages(), listSanghs()]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/admin/students/${id}`} className="text-sm font-semibold text-gold-600">← Back to student</Link>
      <div>
        <h1 className="text-3xl font-bold text-gold-900">Edit {s.first_name} {s.surname}</h1>
        <p className="text-sm text-muted">Student ID {s.student_code}</p>
      </div>
      <StudentEditForm id={id} initial={initial} photoKey={String(s.photo_key)} villages={villages} sanghs={sanghs} />
    </div>
  );
}
