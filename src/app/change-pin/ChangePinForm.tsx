"use client";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { PinPad } from "@/components/PinPad";

export function ChangePinForm() {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stage = pin.length < 4 ? 1 : 2;

  async function save(code: string) {
    setBusy(true);
    const res = await fetch("/api/auth/change-pin", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: code }),
    });
    if (res.ok) window.location.assign("/");
    else { setError(t.common.somethingWrong); setBusy(false); setPin(""); setPin2(""); }
  }

  function onSecond(v: string) {
    setPin2(v); setError(null);
    if (v.length === 4) {
      if (v === pin) save(v);
      else { setError(t.changePin.mismatch); setTimeout(() => setPin2(""), 700); }
    }
  }

  return (
    <section className="fade-up mx-5 mt-3 card p-5 text-center">
      <p className="label">{stage === 1 ? t.changePin.newPin : t.changePin.confirm}</p>
      {stage === 1 ? <PinPad value={pin} onChange={setPin} /> : <PinPad value={pin2} onChange={onSecond} disabled={busy} invalid={!!error} />}
      {error && <p role="alert" className="err mt-3">{error}</p>}
    </section>
  );
}
