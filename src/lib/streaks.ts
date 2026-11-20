import { addDays } from "./dates";

/**
 * Current streak = consecutive days with at least one niyam logged.
 * A streak is still "alive" if today is empty but yesterday was logged.
 */
export function computeStreak(loggedDates: string[], today: string): number {
  const set = new Set(loggedDates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Longest run of consecutive days anywhere in the history. */
export function longestStreak(loggedDates: string[]): number {
  const sorted = [...new Set(loggedDates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export interface StreakBonus {
  days: number;
  points: number;
}

/** "7:50,21:100" → [{days:7, points:50}, {days:21, points:100}] */
export function parseStreakBonuses(raw: string): StreakBonus[] {
  return raw
    .split(",")
    .map((p) => p.trim().split(":"))
    .map(([d, p]) => ({ days: Number(d), points: Number(p) }))
    .filter((b) => Number.isInteger(b.days) && b.days > 0 && Number.isFinite(b.points) && b.points > 0)
    .sort((a, b) => a.days - b.days);
}
