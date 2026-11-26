import { addDays } from "./dates";

/** Number of consecutive logged days ending on `end` (0 if `end` itself is not logged). */
function runEndingAt(logged: Set<string>, end: string): number {
  let n = 0;
  for (let d = end; logged.has(d); d = addDays(d, -1)) n++;
  return n;
}

/**
 * Current streak = consecutive days with at least one niyam logged, ending at the latest logged day.
 * It stays "alive" while every empty day after that one can still be filled in: today always can,
 * and so can the days in `fillable` (the edit window, or days an admin has unlocked).
 * Once an empty day can no longer be logged, the streak is broken (0).
 */
export function computeStreak(loggedDates: string[], today: string, fillable: string[] = []): number {
  const logged = new Set(loggedDates.filter((d) => d <= today));
  const last = [...logged].sort().pop();
  if (!last) return 0;
  const open = new Set(fillable);
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) if (!open.has(d)) return 0;
  return runEndingAt(logged, last);
}

export interface StreakRescue {
  date: string; // the empty past day to log
  run: number; // length of the streak that day would continue
}

/**
 * The oldest empty past day that can still be logged and would continue a streak
 * (the day before it is logged). null when there is nothing to rescue.
 */
export function streakRescue(loggedDates: string[], today: string, fillable: string[]): StreakRescue | null {
  const logged = new Set(loggedDates);
  for (const date of [...fillable].sort()) {
    if (date >= today || logged.has(date)) continue;
    const run = runEndingAt(logged, addDays(date, -1));
    if (run > 0) return { date, run };
  }
  return null;
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
