"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import { PinPad } from "@/components/PinPad";
import { Avatar } from "@/components/Avatar";

interface Pick { id: string; name: string; photo: string }

export function LoginForm({ next = "/" }: { next?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pick, setPick] = useState<{ list: Pick[]; token: string } | null>(null);

  const phoneOk = /^(\+?91)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ""));

  async function submit(code: string) {
    if (!phoneOk) { setError(t.login.badPhone); setPin(""); return; }
    setBusy(true); setError(null);
    let redirecting = false;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, pin: code }),
      });
      const data = await res.json();
      if (res.ok && data.ok) { window.location.assign(next); return; }
      if (res.ok && data.pick) { setPick({ list: data.pick, token: data.token }); return; }
      if (data.error === "notRegistered") {
        setNotice(t.login.notRegistered);
        setTimeout(() => router.push("/register"), 2500);
        redirecting = true; // keep the keypad locked until we navigate
        return;
      }
      setError(data.error === "locked" ? t.login.locked : t.login.wrong);
      setPin("");
    } catch {
      setError(t.common.somethingWrong); setPin("");
    } finally { if (!redirecting) setBusy(false); }
  }

  async function choose(id: string) {
    setBusy(true);
    const res = await fetch("/api/auth/pick", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: pick!.token, studentId: id }),
    });
    if (res.ok) window.location.assign(next);
    else { setPick(null); setPin(""); setError(t.common.somethingWrong); setBusy(false); }
  }

  if (pick) {
    return (
      <section className="fade-up mx-5 mt-4 card p-5">
        <h2 className="text-center text-xl font-semibold text-gold-700">{t.login.whoAreYou}</h2>
        <p className="mb-4 mt-1 text-center text-sm text-muted">{t.login.whoHint}</p>
        <ul className="space-y-3">
          {pick.list.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={busy} onClick={() => choose(p.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-gold-100 bg-white p-3 text-left shadow-soft active:scale-[.98]">
                <Avatar photoKey={p.photo} name={p.name} size={52} />
                <span className="text-lg font-semibold">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="fade-up mx-5 mt-3">
      <div className="card p-5">
        <h2 className="text-center text-xl font-semibold text-gold-700">{t.login.title}</h2>
        <p className="mb-4 text-center text-sm text-muted">{t.login.subtitle}</p>

        <p className="mb-3 rounded-xl border border-gold-300 bg-gold-50 p-3 text-sm font-semibold leading-snug text-gold-700">📱 {t.login.phoneHint}</p>

        <label className="label" htmlFor="phone">{t.login.phone}</label>
        <input id="phone" className="field text-lg tracking-wide" type="tel" inputMode="numeric" autoComplete="tel"
          placeholder="98200 12345" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} />

        <p className="label mt-5 text-center">{t.login.pin}</p>
        <PinPad value={pin} disabled={busy} invalid={!!error}
          onChange={(v) => { setPin(v); setError(null); if (v.length === 4) submit(v); }} />

        {busy && !notice && (
          <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-gold-700">
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />{t.common.loading}
          </p>
        )}
        {error && <p role="alert" className="err mt-4 text-center">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl bg-gold-50 p-3 text-center text-sm font-semibold text-gold-700">{notice}</p>}
      </div>

      <p className="mt-4 px-2 text-center text-sm text-muted">{t.login.forgot}</p>
      <div className="divider my-5">◆</div>
      <p className="text-center">
        <span className="text-muted">{t.login.newStudent} </span>
        <Link href="/register" className="font-semibold text-gold-600 underline underline-offset-4">{t.login.register}</Link>
      </p>
    </section>
  );
}
