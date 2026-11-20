import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { addDays, editableDates, monthOf, todayIST } from "@/lib/dates";
import { getDayEntries, getNiyams, getTotals } from "@/lib/logs";
import { getSettings } from "@/lib/settings";
import { donorFor } from "@/lib/leaderboard";
import { TodayClient } from "./TodayClient";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const student = await requireStudent();
  const { lang } = await getT();
  const today = todayIST();
  const settings = await getSettings();
  const dates = editableDates(today, settings.editWindowDays);
  const [{ niyams, options }, entries, totals, donor] = await Promise.all([
    getNiyams(),
    getDayEntries(student.id, today),
    getTotals(student.id, today, today),
    donorFor(monthOf(today)),
  ]);

  return (
    <TodayClient
      student={{ name: `${student.first_name} ${student.surname}`, firstName: student.first_name, photoKey: student.photo_key }}
      niyams={niyams}
      options={options}
      today={today}
      yesterday={addDays(today, -1)}
      dates={dates}
      windowDays={settings.editWindowDays}
      initialEntries={entries}
      initialTotals={{ monthTotal: totals.monthTotal, streak: totals.streak }}
      donor={donor ? { name: donor.name, photo_key: donor.photo_key, message: (lang === "gu" ? donor.message_gu : donor.message_en) || donor.message_gu || donor.message_en } : null}
    />
  );
}
