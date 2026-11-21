import { editableDates, isEditable } from "./dates";

/**
 * Who may change which day.
 *  - A day inside the edit window can be changed until the student SUBMITS it.
 *  - A submitted day is locked.
 *  - While an admin "unlock" (grant) is active, every day in its range can be changed, submitted or not.
 */

export interface GrantInfo {
  id: number;
  days_back: number; // number of days covered, today counting as day 1
  expires_at: string; // ISO timestamp
}

export interface DayAccess {
  date: string;
  submitted: boolean;
  submitted_at: string | null;
  editable: boolean;
  viaGrant: boolean; // editable only because an admin unlocked it
}

export interface AccessInfo {
  days: DayAccess[]; // newest first
  grant: GrantInfo | null;
  windowDays: number;
}

export function dayAccess(
  date: string,
  today: string,
  windowDays: number,
  grantDays: number | null,
  submitted: boolean,
): { editable: boolean; viaGrant: boolean } {
  const inWindow = isEditable(date, today, windowDays);
  const covered = grantDays !== null && isEditable(date, today, grantDays);
  return { editable: (inWindow && !submitted) || covered, viaGrant: covered && (submitted || !inWindow) };
}

/** submitted: date → submitted_at */
export function buildAccess(
  today: string,
  windowDays: number,
  grant: GrantInfo | null,
  submitted: Map<string, string>,
): AccessInfo {
  const span = Math.max(windowDays, grant?.days_back ?? 0);
  const days = editableDates(today, span).map((date) => {
    const isSub = submitted.has(date);
    return {
      date,
      submitted: isSub,
      submitted_at: submitted.get(date) ?? null,
      ...dayAccess(date, today, windowDays, grant?.days_back ?? null, isSub),
    };
  });
  return { days, grant, windowDays };
}
