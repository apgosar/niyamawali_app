"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import { todayIST } from "@/lib/dates";
import { normalizeSangh } from "@/lib/village-text";
import { PhotoPicker } from "@/components/PhotoPicker";
import { PinPad } from "@/components/PinPad";
import { MultiSelect } from "@/components/MultiSelect";
import { Combobox } from "@/components/Combobox";
import { NO_SHIBIR, PREVIOUS_SHIBIRS, STANDARDS, pickShibirs, standardLabel } from "@/lib/profile-options";

type Errors = Record<string, string>;
interface Props {
  refCode: string;
  badRef: boolean;
  referrerName: string | null;
  bonus: number;
  suggestions: { sangh: string[]; residence: string[]; village: string[] };
}

const STEP_FIELDS: string[][] = [
  ["photo", "first_name", "surname", "gender", "dob", "village"],
  ["father_name", "father_phone", "mother_name", "mother_phone", "own_phone", "parent"],
  ["residence", "sangh", "standard", "dharmik_abhyas", "pathshala", "pathshala_name", "previous_shibirs"],
  ["pin"],
];
const TOTAL = STEP_FIELDS.length;
const phoneRe = /^(\+?91)?[6-9]\d{9}$/;
const cleanPhone = (s: string) => s.replace(/[\s-]/g, "");

function Field({ k, label, hint, error, children }: { k: string; label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      {children}
      {error ? <p role="alert" className="err">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function RegisterForm({ refCode, badRef, referrerName, bonus, suggestions }: Props) {
  const { t, f, n, lang } = useI18n();
  const r = t.register;
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Record<string, string>>({ pathshala: "", gender: "", standard: "" });
  const [shibirs, setShibirs] = useState<string[]>([]);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const today = useMemo(() => todayIST(), []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => { const c = { ...s }; delete c[k]; return c; });
  };
  const msg = (code?: string) => {
    if (!code) return null;
    const map: Record<string, string> = {
      required: r.errRequired, phone: r.errPhone, name: r.errName, photo: r.errPhoto, parent: r.errParent,
      pin: r.errPin, dob: r.errDob, exists: r.errExists, server: t.common.somethingWrong,
    };
    return map[code] ?? t.common.somethingWrong;
  };

  /** Same rules as the server; the server re-checks everything. */
  function validate(s: number): Errors {
    const e: Errors = {};
    const req = (k: string) => { if (!v[k]?.trim()) e[k] = "required"; };
    if (s === 0) {
      if (!photo) e.photo = "photo";
      req("first_name"); req("surname"); req("village"); req("gender");
      if (v.first_name && /\s/.test(v.first_name.trim())) e.first_name = "name";
      if (!v.dob) e.dob = "dob";
    }
    if (s === 1) {
      const fOk = !!v.father_name?.trim() && phoneRe.test(cleanPhone(v.father_phone ?? ""));
      const mOk = !!v.mother_name?.trim() && phoneRe.test(cleanPhone(v.mother_phone ?? ""));
      if (v.father_phone && !phoneRe.test(cleanPhone(v.father_phone))) e.father_phone = "phone";
      if (v.mother_phone && !phoneRe.test(cleanPhone(v.mother_phone))) e.mother_phone = "phone";
      if (v.own_phone && !phoneRe.test(cleanPhone(v.own_phone))) e.own_phone = "phone";
      if (!fOk && !mOk) {
        e.parent = "parent";
        if (v.father_name?.trim() && !v.father_phone) e.father_phone = "required";
        if (v.mother_name?.trim() && !v.mother_phone) e.mother_phone = "required";
      }
    }
    if (s === 2) {
      req("residence"); req("sangh"); req("dharmik_abhyas"); req("standard");
      if (!v.pathshala) e.pathshala = "required";
      if (v.pathshala === "yes") req("pathshala_name");
      if (!shibirs.length) e.previous_shibirs = "required";
    }
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(finalPin: string) {
    setBusy(true); setFormError(null);
    const fd = new FormData();
    for (const [k, val] of Object.entries(v)) fd.set(k, val);
    shibirs.forEach((s) => fd.append("previous_shibirs", s));
    fd.set("pin", finalPin);
    if (refCode) fd.set("ref", refCode);
    if (photo) fd.set("photo", photo, "photo.jpg");
    try {
      const res = await fetch("/api/auth/register", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) { window.location.assign("/"); return; }
      const errs: Errors = data.errors ?? {};
      if (errs.form) { setFormError(msg(errs.form)); }
      else {
        setErrors(errs);
        const first = STEP_FIELDS.findIndex((fields) => fields.some((k) => errs[k]));
        if (first >= 0 && first < TOTAL - 1) setStep(first);
        setFormError(r.errFix);
      }
      setPin(""); setPin2("");
    } catch {
      setFormError(t.common.somethingWrong);
    } finally { setBusy(false); }
  }

  const pinStage = pin.length < 4 ? 1 : 2;
  const mismatch = pin.length === 4 && pin2.length === 4 && pin !== pin2;

  function onPin2(val: string) {
    setPin2(val);
    if (val.length === 4) {
      if (val === pin) submit(val);
      else setTimeout(() => setPin2(""), 700);
    }
  }

  const text = (k: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={k} name={k} className="field" value={v[k] ?? ""} onChange={set(k)} aria-invalid={!!errors[k]} {...extra} />
  );

  return (
    <section className="fade-up mx-5 mt-3">
      {referrerName && (
        <div className="mb-4 rounded-2xl border border-lotus-200 bg-lotus-50 p-4 text-center shadow-soft">
          <p className="text-lg font-semibold text-lotus-600">{f(r.invitedBy, { name: referrerName })}</p>
          <p className="mt-1 text-sm text-ink">{f(r.invitedHint, { name: referrerName, bonus: n(bonus) })}</p>
          <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 font-mono text-sm tracking-widest text-gold-700">{refCode}</p>
        </div>
      )}
      {badRef && <p className="mb-4 rounded-xl bg-gold-50 p-3 text-sm text-gold-700">{r.badCode}</p>}

      {/* progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm font-semibold text-gold-700">
          <span>{f(r.step, { n: n(step + 1), total: n(TOTAL) })}</span>
          <span>{[r.s1, r.s2, r.s3, r.s4][step]}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gold-100">
          <div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all" style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
        </div>
      </div>

      <div className="card space-y-4 p-5">
        {step === 0 && (
          <>
            <div className="flex flex-col items-center">
              <PhotoPicker invalid={!!errors.photo} onChange={(b) => { setPhoto(b); setErrors((s) => ({ ...s, photo: "" })); }} />
              {errors.photo && <p role="alert" className="err">{msg(errors.photo)}</p>}
            </div>
            <Field k="first_name" error={msg(errors.first_name)} label={`${r.firstName} *`} hint={r.firstNameHint}>
              {text("first_name", { autoComplete: "given-name", autoCapitalize: "words" })}
            </Field>
            <Field k="surname" error={msg(errors.surname)} label={`${r.surname} *`}>{text("surname", { autoComplete: "family-name", autoCapitalize: "words" })}</Field>
            <div>
              <p className="label">{r.gender} *</p>
              <div className="grid grid-cols-2 gap-3">
                {([["M", r.male], ["F", r.female]] as const).map(([g, label]) => (
                  <button key={g} type="button" aria-pressed={v.gender === g}
                    onClick={() => { setV((s) => ({ ...s, gender: g })); setErrors((s) => ({ ...s, gender: "" })); }}
                    className={`min-h-12 rounded-xl border-2 font-semibold transition ${
                      v.gender === g ? "border-sage-500 bg-sage-50 text-sage-700" : errors.gender ? "border-danger bg-white text-ink" : "border-gold-100 bg-white text-ink"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {errors.gender && <p role="alert" className="err">{msg(errors.gender)}</p>}
            </div>
            <Field k="dob" error={msg(errors.dob)} label={`${r.dob} *`}>{text("dob", { type: "date", max: today, min: "1930-01-01" })}</Field>
            <Field k="village" error={msg(errors.village)} label={`${r.village} *`}>
              <Combobox id="village" value={v.village ?? ""} options={suggestions.village} placeholder={r.villageSearch} invalid={!!errors.village}
                addLabel={r.villageAdd} newHint={r.villageNew}
                onChange={(val) => { setV((s) => ({ ...s, village: val })); if (errors.village) setErrors((s) => ({ ...s, village: "" })); }} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <p className="rounded-xl bg-gold-50 p-3 text-sm text-gold-700">{r.parentRule}</p>
            {errors.parent && <p role="alert" className="err">{msg(errors.parent)}</p>}
            <Field k="mother_name" error={msg(errors.mother_name)} label={r.motherName}>{text("mother_name", { autoCapitalize: "words" })}</Field>
            <Field k="mother_phone" error={msg(errors.mother_phone)} label={r.motherPhone}>{text("mother_phone", { type: "tel", inputMode: "numeric" })}</Field>
            <Field k="father_name" error={msg(errors.father_name)} label={r.fatherName}>{text("father_name", { autoCapitalize: "words" })}</Field>
            <Field k="father_phone" error={msg(errors.father_phone)} label={r.fatherPhone}>{text("father_phone", { type: "tel", inputMode: "numeric" })}</Field>
            <Field k="own_phone" error={msg(errors.own_phone)} label={`${r.ownPhone} (${t.common.optional})`}>{text("own_phone", { type: "tel", inputMode: "numeric" })}</Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field k="residence" error={msg(errors.residence)} label={`${r.residence} *`} hint={r.residenceHint}>{text("residence", { list: "dl-residence" })}</Field>
            <Field k="sangh" error={msg(errors.sangh)} label={`${r.sangh} *`}>
              <Combobox id="sangh" value={v.sangh ?? ""} options={suggestions.sangh} placeholder={r.sanghSearch} invalid={!!errors.sangh}
                addLabel={r.sanghAdd} newHint={r.sanghNew} normalize={normalizeSangh}
                onChange={(val) => { setV((s) => ({ ...s, sangh: val })); if (errors.sangh) setErrors((s) => ({ ...s, sangh: "" })); }} />
            </Field>
            <Field k="standard" error={msg(errors.standard)} label={`${r.standard} *`}>
              <select id="standard" name="standard" className="field" value={v.standard ?? ""} aria-invalid={!!errors.standard}
                onChange={(e) => { setV((s) => ({ ...s, standard: e.target.value })); setErrors((s) => ({ ...s, standard: "" })); }}>
                <option value="">{r.standardPick}</option>
                {STANDARDS.map((n2) => <option key={n2} value={n2}>{standardLabel(n2, lang)}</option>)}
              </select>
            </Field>
            <Field k="dharmik_abhyas" error={msg(errors.dharmik_abhyas)} label={`${r.abhyas} *`} hint={r.abhyasHint}>{text("dharmik_abhyas")}</Field>
            <div>
              <p className="label">{r.pathshala} *</p>
              <div className="grid grid-cols-2 gap-3">
                {(["yes", "no"] as const).map((o) => (
                  <button key={o} type="button" aria-pressed={v.pathshala === o}
                    onClick={() => { setV((s) => ({ ...s, pathshala: o })); setErrors((s) => ({ ...s, pathshala: "" })); }}
                    className={`min-h-12 rounded-xl border-2 font-semibold transition ${
                      v.pathshala === o ? "border-sage-500 bg-sage-50 text-sage-700" : "border-gold-100 bg-white text-ink"}`}>
                    {o === "yes" ? t.common.yes : t.common.no}
                  </button>
                ))}
              </div>
              {errors.pathshala && <p role="alert" className="err">{msg(errors.pathshala)}</p>}
            </div>
            {v.pathshala === "yes" && (
              <Field k="pathshala_name" error={msg(errors.pathshala_name)} label={`${r.pathshalaWhich} *`} hint={r.pathshalaHint}>{text("pathshala_name")}</Field>
            )}
            <Field k="previous_shibirs" label={`${r.previousShibir} *`} error={msg(errors.previous_shibirs)} hint={r.previousHint}>
              <MultiSelect id="previous_shibirs" invalid={!!errors.previous_shibirs}
                options={[...PREVIOUS_SHIBIRS.map((s) => ({ value: s.code as string, label: s.label as string })), { value: NO_SHIBIR, label: r.noneOfAbove }]}
                value={shibirs} onChange={(next) => setShibirs((before) => pickShibirs(before, next))} placeholder={r.selectPlaceholder} />
            </Field>
          </>
        )}

        {step === 3 && (
          <div className="text-center">
            <p className="mb-4 text-sm text-muted">{r.pinHelp}</p>
            <p className="label">{pinStage === 1 ? r.pin : r.confirmPin}</p>
            {pinStage === 1
              ? <PinPad value={pin} onChange={setPin} disabled={busy} />
              : <PinPad value={pin2} onChange={onPin2} disabled={busy} invalid={mismatch} />}
            {mismatch && <p role="alert" className="err mt-3">{r.pinMismatch}</p>}
            {pinStage === 2 && !busy && (
              <button type="button" className="mt-4 text-sm font-semibold text-gold-600" onClick={() => { setPin(""); setPin2(""); }}>← {r.pin}</button>
            )}
            {busy && <p className="mt-4 text-gold-700">{r.submitting}</p>}
          </div>
        )}

        {formError && <p role="alert" className="err rounded-xl bg-red-50 p-3 text-center">{formError}</p>}

        <div className="flex gap-3 pt-1">
          {step > 0 && (
            <button type="button" className="btn btn-ghost flex-1" disabled={busy} onClick={() => setStep((s) => s - 1)}>{t.common.back}</button>
          )}
          {step < TOTAL - 1 && <button type="button" className="btn btn-gold flex-[2]" onClick={next}>{t.common.next}</button>}
        </div>
      </div>

      <p className="mt-5 text-center">
        <span className="text-muted">{r.haveAccount} </span>
        <Link href="/login" className="font-semibold text-gold-600 underline underline-offset-4">{r.login}</Link>
      </p>

      <datalist id="dl-residence">{suggestions.residence.map((s) => <option key={s} value={s} />)}</datalist>
    </section>
  );
}
