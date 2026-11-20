"use client";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
}

/** Big on-screen keypad: fewest taps, no phone keyboard popping up. Also accepts a hardware keyboard. */
export function PinPad({ value, onChange, length = 4, disabled, invalid }: Props) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (/^\d$/.test(e.key) && value.length < length) onChange(value + e.key);
      else if (e.key === "Backspace") onChange(value.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, length, disabled, onChange]);

  const press = (d: string) => !disabled && value.length < length && onChange(value + d);
  const key = "h-14 rounded-2xl border border-gold-100 bg-ivory text-2xl font-semibold text-gold-900 shadow-soft active:scale-95 active:bg-gold-50 disabled:opacity-50 transition";

  return (
    <div className="mx-auto w-full max-w-[18rem]">
      <div className={`mb-5 flex justify-center gap-4 ${invalid ? "animate-[pop_.3s]" : ""}`} aria-live="polite">
        {Array.from({ length }).map((_, i) => (
          <span key={i}
            className={`h-4 w-4 rounded-full border-2 transition-all ${
              i < value.length ? "scale-110 border-gold-500 bg-gold-500" : invalid ? "border-danger" : "border-gold-300"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className={key} disabled={disabled} onClick={() => press(d)}>{d}</button>
        ))}
        <span />
        <button type="button" className={key} disabled={disabled} onClick={() => press("0")}>0</button>
        <button type="button" className={`${key} text-xl`} disabled={disabled || !value} aria-label="Delete"
          onClick={() => onChange(value.slice(0, -1))}>⌫</button>
      </div>
    </div>
  );
}
