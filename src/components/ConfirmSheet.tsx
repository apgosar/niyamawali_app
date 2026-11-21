"use client";
import { createPortal } from "react-dom";
import { useEffect } from "react";

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A bottom sheet that asks "are you sure?" – rendered in <body> so no animated parent can displace it. */
export function ConfirmSheet({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onCancel]);

  return createPortal(
    <div role="alertdialog" aria-modal="true" aria-label={title}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-gold-900/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="safe-bottom fade-up w-full max-w-md rounded-t-3xl bg-ivory p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center text-xl font-bold text-gold-700">{title}</h2>
        <p className="mb-5 mt-2 text-center text-[15px] leading-snug text-ink">{body}</p>
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="btn btn-gold" onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
