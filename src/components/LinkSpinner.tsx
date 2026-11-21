"use client";
import { useLinkStatus } from "next/link";

/**
 * A small spinner for the inside of a <Link>: invisible normally, spinning while that link's page is loading.
 * It always takes up the same space, so nothing jumps when it appears.
 */
export function LinkSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden
      className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent transition-opacity ${pending ? "animate-spin opacity-100" : "opacity-0"} ${className}`} />
  );
}
