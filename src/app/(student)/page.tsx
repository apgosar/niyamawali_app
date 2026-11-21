import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { addDays, monthOf, todayIST } from "@/lib/dates";
import { getAccess, getDayEntries, getNiyams, getTotals } from "@/lib/logs";
import { donorFor } from "@/lib/leaderboard";
import { TodayClient } from "./TodayClient";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const student = await requireStudent();
  const { lang } = await getT();
  const today = todayIST();
  const [{ niyams, options }, entries, totals, donor, access] = await Promise.all([
    getNiyams(),
    getDayEntries(student.id, today),
    getTotals(student.id, today, today),
    donorFor(monthOf(today)),
    getAccess(student.id, today),
  ]);

  return (
    <TodayClient
      student={{ name: `${student.first_name} ${student.surname}`, firstName: student.first_name, photoKey: student.photo_key, code: student.student_code }}
      niyams={niyams}
      options={options}
      today={today}
      yesterday={addDays(today, -1)}
      initialAccess={access}
      initialEntries={entries}
      initialTotals={{ monthTotal: totals.monthTotal, streak: totals.streak }}
      donor={donor ? { name: donor.name, photo_key: donor.photo_key, message: (lang === "gu" ? donor.message_gu : donor.message_en) || donor.message_gu || donor.message_en } : null}
    />
  );
}
