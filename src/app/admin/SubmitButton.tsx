"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/** A submit button for server-action forms: shows a spinner and cannot be pressed twice while the request runs. */
export function SubmitButton({ children, className = "", pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} ${pending ? "opacity-70" : ""}`}>
      {pending && <span aria-hidden className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-3px]" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
