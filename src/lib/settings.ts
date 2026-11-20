import { query } from "./db";
import { parseStreakBonuses, type StreakBonus } from "./streaks";

export interface AppSettings {
  editWindowDays: number;
  referralBonus: number;
  referralUnlockDays: number;
  streakBonuses: StreakBonus[];
  raw: Record<string, string>;
}

const DEFAULTS: Record<string, string> = {
  edit_window_days: "3",
  referral_bonus: "100",
  referral_unlock_days: "3",
  streak_bonuses: "7:50,21:100,51:200,108:500",
};

const posInt = (v: string, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await query<{ key: string; value: string }>("select key, value from settings");
  const raw = { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  return {
    editWindowDays: Math.max(1, posInt(raw.edit_window_days, 3)),
    referralBonus: posInt(raw.referral_bonus, 100),
    referralUnlockDays: Math.max(1, posInt(raw.referral_unlock_days, 3)),
    streakBonuses: parseStreakBonuses(raw.streak_bonuses),
    raw,
  };
}

export async function saveSettings(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    await query(
      "insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value",
      [key, value],
    );
  }
}
