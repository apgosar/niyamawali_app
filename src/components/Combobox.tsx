"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { findExact, normalizeVillage, rankMatches } from "@/lib/village-text";

/**
 * A text box with a live-filtered list under it. Pick a suggestion, or just keep what you typed:
 * anything is accepted, and a value that is not on the list is marked as new.
 */
export function Combobox({ id, value, onChange, options, placeholder, invalid, addLabel, newHint, normalize = normalizeVillage, autoComplete = "off" }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
  /** text of the "use what I typed" row, with {name} */
  addLabel: string;
  /** hint shown when the typed value is not on the list, with {name} */
  newHint: string;
  /** how a new value is tidied before it is added */
  normalize?: (typed: string) => string;
  autoComplete?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  const matches = useMemo(() => rankMatches(options, value), [options, value]);
  const typed = normalize(value);
  const exact = findExact(options, value);
  const canAdd = typed.length >= 2 && !exact;
  const rows = canAdd ? [...matches, null] : matches; // null = the "use what I typed" row

  // close on a tap outside
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function choose(row: string | null) {
    if (row !== null) onChange(row);
    setOpen(false);
    setActive(-1);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(rows.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { if (open && active >= 0 && active < rows.length) { e.preventDefault(); choose(rows[active]); } else setOpen(false); }
    else if (e.key === "Escape") setOpen(false);
  }

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <div ref={root} className="relative">
      <input id={id} name={id} type="text" role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined} aria-invalid={invalid}
        autoComplete={autoComplete} autoCapitalize="words" enterKeyHint="done" placeholder={placeholder}
        className="field" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)} onKeyDown={onKey} />

      {open && rows.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-gold-300 bg-white p-1 shadow-lg">
          {rows.map((row, i) => (
            <li key={row ?? "__new"} id={optionId(i)} role="option" aria-selected={i === active}
              // mouse/touch down (not click) so the input keeps focus and the list does not close before we pick
              onPointerDown={(e) => { e.preventDefault(); choose(row); }}
              onPointerEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2 text-[15px] leading-snug ${i === active ? "bg-gold-50" : ""} ${row === null ? "border-t border-gold-100 font-semibold text-gold-700" : ""} ${row !== null && row === exact ? "font-semibold text-sage-700" : ""}`}>
              {row ?? `➕ ${addLabel.replace("{name}", typed)}`}
            </li>
          ))}
        </ul>
      )}

      {!open && canAdd && <p className="hint">{newHint.replace("{name}", typed)}</p>}
      {/* a long name does not fit in the box: show all of it underneath */}
      {!open && exact && exact.length > 32 && <p className="hint">✓ {exact}</p>}
    </div>
  );
}
