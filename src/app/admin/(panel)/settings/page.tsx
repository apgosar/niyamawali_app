import { getSettings } from "@/lib/settings";
import { SettingsForm } from "../../forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <section className="card mx-auto max-w-xl p-5">
      <h1 className="mb-4 text-2xl font-bold text-gold-700">Settings</h1>
      <SettingsForm values={s.raw} />
    </section>
  );
}
