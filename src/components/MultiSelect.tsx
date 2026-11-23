"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";

export interface MultiOption {
  value: string;
  label: string;
}

/**
 * A dropdown with a checklist: tap to open, tick any number of options, tap "Done" (or outside) to close.
 * The chosen values are held by the parent (`value` / `onChange`).
 */
export function MultiSelect({ id, options, value, onChange, placeholder, invalid }: {
  id: string;
  options: MultiOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  invalid?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Close on a tap outside or the Escape key.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", esc); };
  }, [open]);

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const chosen = options.filter((o) => value.includes(o.value));

  return (
    <div ref={root} className="relative">
      <button type="button" id={id} aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid}
        onClick={() => setOpen((o) => !o)} className="field flex items-center justify-between gap-2 text-left">
        <span className={`min-w-0 flex-1 truncate ${chosen.length ? "" : "text-muted"}`}>
          {chosen.length ? chosen.map((o) => o.label).join(", ") : placeholder}
        </span>
        <span aria-hidden className={`shrink-0 text-gold-600 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div role="listbox" aria-multiselectable="true" className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-gold-300 bg-white p-1.5 shadow-lg">
          {options.map((o) => {
            const on = value.includes(o.value);
            return (
              <label key={o.value} role="option" aria-selected={on}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 transition-colors ${on ? "bg-sage-50" : "hover:bg-gold-50"}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(o.value)} className="h-5 w-5 shrink-0 accent-[#b8862b]" />
                <span className={`flex-1 ${on ? "font-semibold text-sage-700" : ""}`}>{o.label}</span>
              </label>
            );
          })}
          <button type="button" onClick={() => setOpen(false)} className="btn btn-gold mt-1.5 min-h-10 w-full py-2">{t.common.done}</button>
        </div>
      )}
    </div>
  );
}
