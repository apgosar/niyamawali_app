import { grantEditAction, revokeGrantAction } from "./actions";
import { SubmitButton } from "./SubmitButton";

/** "Unlock editing" form: the student may edit the last N days for the next H hours. */
export function UnlockForm({ studentId, back, defaultDays, defaultHours, compact = false }: {
  studentId: string; back: string; defaultDays: number; defaultHours: number; compact?: boolean;
}) {
  const uid = `${studentId.slice(0, 8)}-${compact ? "c" : "f"}`;
  return (
    <form action={grantEditAction} className="space-y-3">
      <input type="hidden" name="id" value={studentId} />
      <input type="hidden" name="back" value={back} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`days-${uid}`}>Unlock last … days</label>
          <input id={`days-${uid}`} name="days" type="number" min={1} max={62} defaultValue={defaultDays} className="field" required />
        </div>
        <div>
          <label className="label" htmlFor={`hours-${uid}`}>Open for … hours</label>
          <input id={`hours-${uid}`} name="hours" type="number" min={1} max={720} defaultValue={defaultHours} className="field" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`note-${uid}`}>Note (optional)</label>
        <input id={`note-${uid}`} name="note" className="field" maxLength={200} placeholder="e.g. Parents called – hostel sheet of 1–15 Nov" />
      </div>
      <SubmitButton className="btn btn-gold w-full" pendingText="Unlocking…">🔓 Unlock editing</SubmitButton>
      <p className="hint">Today counts as day 1. The student can change any of these days, even ones already submitted, until the time is up. A new unlock replaces an earlier one.</p>
    </form>
  );
}

export function RevokeButton({ grantId, back }: { grantId: number; back: string }) {
  return (
    <form action={revokeGrantAction}>
      <input type="hidden" name="grantId" value={grantId} />
      <input type="hidden" name="back" value={back} />
      <SubmitButton className="text-sm font-semibold text-danger" pendingText="Locking…">Lock again</SubmitButton>
    </form>
  );
}
