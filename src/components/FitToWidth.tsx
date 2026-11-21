"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shows a fixed-width design (e.g. a 360px card that is exported as an image) shrunk to fit narrow phones.
 * The children keep their real size, so capturing them as an image still gives the full-resolution picture.
 */
export function FitToWidth({ width, children }: { width: number; children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const w = wrap.current;
    const i = inner.current;
    if (!w || !i) return;
    const measure = () => {
      const scale = Math.min(1, w.clientWidth / width);
      setFit({ scale, height: i.offsetHeight * scale });
    };
    const ro = new ResizeObserver(measure); // fires once on observe, then on every size change
    ro.observe(w);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={wrap} className="mx-auto w-full" style={{ maxWidth: width, height: fit.height || undefined }}>
      <div ref={inner} style={{ width, transform: `scale(${fit.scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}
