"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";

/** Counts smoothly from the previous value to the new one. */
export function AnimatedNumber({ value, duration = 350 }: { value: number; duration?: number }) {
  const { n } = useI18n();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(start + (value - start) * eased);
      from.current = cur;
      setShown(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{n(shown)}</>;
}
