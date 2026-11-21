"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { addNiyamAction, saveNiyamsAction, type ActionState } from "../../actions";
import { SubmitButton } from "../../SubmitButton";

export interface NiyamRow { id: number; sort_order: number; name_gu: string; name_en: string; type: string; points: number; points_per_unit: number; max_count: number; active: boolean }
export interface OptionRow { id: number; niyam_id: number; label_gu: string; label_en: string; points: number; active: boolean }

const NONE: ActionState = {};
const tick = "h-5 w-5 accent-[#b8862b]";

/** One form for the whole page: edit anything, press Save once. */
export function NiyamsForm({ niyams, options }: { niyams: NiyamRow[]; options: OptionRow[] }) {
  const [state, action] = useActionState(saveNiyamsAction, null);
  const current = state ?? NONE;
  // "Unsaved changes" = something was edited since the last result came back.
  const [editedAfter, setEditedAfter] = useState<ActionState | null>(null);
  const dirty = editedAfter === current;
  const [rescore, setRescore] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(false);

  // The floating Save button is shown until the Save button at the end of the page is on screen.
  useEffect(() => {
    const el = bottom.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAtBottom(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Don't lose work by accident.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const status = current.error
    ? { text: `⚠ ${current.error}`, cls: "text-danger" }
    : dirty
      ? { text: rescore ? "Unsaved changes · past entries will be re-scored" : "Unsaved changes", cls: "text-gold-700" }
      : current.ok
        ? { text: current.ok, cls: "text-sage-700" }
        : null;

  return (
    <form action={action} onChange={() => setEditedAfter(current)} className="space-y-5">
      <input type="hidden" name="ids" value={niyams.map((n) => n.id).join(",")} />
      <input type="hidden" name="opt_ids" value={options.map((o) => o.id).join(",")} />

      <div className="card p-4">
        <h1 className="text-2xl font-bold text-gold-700">Niyams & points</h1>
        <p className="mt-1 text-sm text-muted">
          Edit as many niyams as you like, then press <b>Save all changes</b> once (the button follows you down the page).
          New points apply to entries made <b>from now on</b>; to re-score what students have already logged, tick the box above the
          Save button at the bottom. Untick <i>Active</i> to hide a niyam from students.
        </p>
      </div>

      <ul className="space-y-3">
        {niyams.map((n) => (
          <li key={n.id} className={`card p-4 ${n.active ? "" : "opacity-60"}`}>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[4.5rem_1fr_1fr]">
                <div><label className="label" htmlFor={`n${n.id}_sort`}>No.</label><input id={`n${n.id}_sort`} name={`n${n.id}_sort`} type="number" defaultValue={n.sort_order} className="field" /></div>
                <div><label className="label" htmlFor={`n${n.id}_gu`}>Gujarati</label><input id={`n${n.id}_gu`} name={`n${n.id}_gu`} defaultValue={n.name_gu} className="field" required /></div>
                <div><label className="label" htmlFor={`n${n.id}_en`}>English</label><input id={`n${n.id}_en`} name={`n${n.id}_en`} defaultValue={n.name_en} className="field" required /></div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold uppercase text-gold-700">{n.type === "boolean" ? "Yes / No" : n.type === "count" ? "Count" : "Choice"}</span>
                {n.type === "boolean" && (
                  <div className="w-28"><label className="label" htmlFor={`n${n.id}_points`}>Points</label><input id={`n${n.id}_points`} name={`n${n.id}_points`} type="number" min={0} defaultValue={n.points} className="field" /></div>
                )}
                {n.type === "count" && (<>
                  <div className="w-32"><label className="label" htmlFor={`n${n.id}_ppu`}>Points each</label><input id={`n${n.id}_ppu`} name={`n${n.id}_ppu`} type="number" min={0} defaultValue={n.points_per_unit} className="field" /></div>
                  <div className="w-28"><label className="label" htmlFor={`n${n.id}_max`}>Max count</label><input id={`n${n.id}_max`} name={`n${n.id}_max`} type="number" min={1} defaultValue={n.max_count} className="field" /></div>
                </>)}
                {n.type === "choice" && <p className="pb-3 text-sm text-muted">Points are set per option below.</p>}
                <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name={`n${n.id}_active`} defaultChecked={n.active} className={tick} /> Active</label>
              </div>
            </div>

            {n.type === "choice" && (
              <div className="mt-3 space-y-2 border-t border-gold-100 pt-3">
                {options.filter((o) => o.niyam_id === n.id).map((o) => (
                  <div key={o.id} className="flex flex-wrap items-end gap-3 rounded-xl p-2">
                    <div className="min-w-32 flex-1"><label className="label" htmlFor={`o${o.id}_gu`}>Gujarati</label><input id={`o${o.id}_gu`} name={`o${o.id}_gu`} defaultValue={o.label_gu} className="field" required /></div>
                    <div className="min-w-32 flex-1"><label className="label" htmlFor={`o${o.id}_en`}>English</label><input id={`o${o.id}_en`} name={`o${o.id}_en`} defaultValue={o.label_en} className="field" required /></div>
                    <div className="w-24"><label className="label" htmlFor={`o${o.id}_points`}>Points</label><input id={`o${o.id}_points`} name={`o${o.id}_points`} type="number" min={0} defaultValue={o.points} className="field" /></div>
                    <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name={`o${o.id}_active`} defaultChecked={o.active} className={tick} /> Active</label>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Save at the end of the page */}
      <div ref={bottom} className="card space-y-3 p-4">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="rescore" checked={rescore} onChange={(e) => setRescore(e.target.checked)} className={`mt-0.5 ${tick}`} />
          <span><b>Also re-score past entries</b> for the niyams whose points I changed (for example when replacing the placeholder 10 points).
            Leave unticked to apply new points only to entries made from now on.</span>
        </label>
        {status && <p role={current.error ? "alert" : "status"} className={`text-sm font-semibold ${status.cls}`}>{status.text}</p>}
        <SubmitButton className="btn btn-gold w-full sm:w-auto" pendingText="Saving…">💾 Save all changes</SubmitButton>
      </div>

      {/* Floating Save: follows you until the bottom Save is in view */}
      <div inert={atBottom} aria-hidden={atBottom}
        style={{ bottom: "calc(var(--sab) + 1rem)" }}
        className={`pointer-events-none fixed inset-x-0 z-40 flex justify-end px-4 transition-all duration-200 ${atBottom ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"}`}>
        <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl border border-gold-300 bg-ivory px-3 py-2 shadow-lg">
          {status && <span className={`max-w-[11rem] text-xs font-semibold leading-snug sm:max-w-sm ${status.cls}`}>{status.text}</span>}
          <SubmitButton className="btn btn-gold min-h-10 shrink-0 px-4 py-2" pendingText="Saving…">💾 Save all changes</SubmitButton>
        </div>
      </div>
    </form>
  );
}

/** Adds a niyam without leaving the page. */
export function AddNiyamForm() {
  const [state, action] = useActionState(addNiyamAction, null);
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-lg font-bold text-gold-700">Add a niyam</h2>
      <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_9rem_7rem_auto] md:items-end">
        <div><label className="label" htmlFor="add_gu">Gujarati</label><input id="add_gu" name="name_gu" className="field" /></div>
        <div><label className="label" htmlFor="add_en">English</label><input id="add_en" name="name_en" className="field" /></div>
        <div><label className="label" htmlFor="add_type">Type</label><select id="add_type" name="type" className="field"><option value="boolean">Yes / No</option><option value="count">Count (× points)</option></select></div>
        <div><label className="label" htmlFor="add_pts">Points</label><input id="add_pts" name="points" type="number" min={0} defaultValue={10} className="field" /></div>
        <SubmitButton className="btn btn-gold" pendingText="Adding…">Add</SubmitButton>
      </form>
      {state?.error && <p role="alert" className="err mt-3">{state.error}</p>}
      {state?.ok && <p role="status" className="mt-3 rounded-lg bg-sage-50 p-2 text-sm font-semibold text-sage-700">{state.ok}</p>}
    </section>
  );
}
