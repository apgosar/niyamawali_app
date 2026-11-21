"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/I18nProvider";

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function InstallCard() {
  const { t } = useI18n();
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const none = () => () => {};
  // Server render assumes "installed" so nothing flashes; the client then reads the real values.
  const installed = useSyncExternalStore(
    none,
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true,
    () => true,
  );
  const ios = useSyncExternalStore(none, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed || (!evt && !ios)) return null;
  return (
    <section className="card p-4">
      <h2 className="text-lg font-bold text-gold-700">📲 {t.profile.install}</h2>
      <p className="mt-1 text-sm text-muted">{t.profile.installHelp}</p>
      {evt ? (
        <button type="button" className="btn btn-gold mt-3 w-full" onClick={async () => { await evt.prompt(); setEvt(null); }}>{t.profile.installButton}</button>
      ) : (
        <p className="mt-2 rounded-xl bg-gold-50 p-3 text-sm text-gold-700">{t.profile.installIos}</p>
      )}
    </section>
  );
}

export function LogoutButton() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  async function logout() {
    if (!confirm(t.profile.logoutConfirm)) return;
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.assign("/login"); }
  }
  return (
    <button type="button" onClick={logout} disabled={busy} aria-busy={busy} className="flex w-full items-center justify-between p-4 text-left font-semibold text-danger disabled:opacity-70">
      <span>🚪 {t.profile.logout}</span>
      {busy ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <span aria-hidden>›</span>}
    </button>
  );
}
