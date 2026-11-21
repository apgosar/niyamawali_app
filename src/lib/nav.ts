/** Only allow redirects to pages on this site ("/results/2026-10"), never to another address. */
export function safeNext(v: string | null | undefined): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/";
  return v;
}
