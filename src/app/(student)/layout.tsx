import { redirect } from "next/navigation";
import { getStudent } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const student = await getStudent();
  if (!student) redirect("/login");
  if (student.must_change_pin) redirect("/change-pin");
  return (
    <div className="mx-auto min-h-dvh max-w-md" style={{ paddingBottom: "calc(var(--nav-h) + 1.5rem)" }}>
      {children}
      <BottomNav />
    </div>
  );
}
