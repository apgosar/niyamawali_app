"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import { PhotoPicker } from "@/components/PhotoPicker";
import { MultiSelect } from "@/components/MultiSelect";
import { Combobox } from "@/components/Combobox";
import { normalizeSangh } from "@/lib/village-text";
import { PREVIOUS_SHIBIRS, STANDARDS, parseShibirs, standardLabel } from "@/lib/profile-options";

function Field({ k, label, error, children }: { k: string; label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      {children}
      {error && <p role="alert" className="err">{error}</p>}
    </div>
  );
}

export function EditForm({ initial, photoKey, villages, sanghs }: { initial: Record<string, string>; photoKey: string; villages: string[]; sanghs: string[] }) {
  const { t, lang } = useI18n();
  const r = t.register;
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [shibirs, setShibirs] = useState<string[]>(parseShibirs(initial.previous_shibirs));
  const genderLocked = initial.gender === "M" || initial.gender === "F"; // part of the Student ID: set once
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const msg = (c?: string) => !c ? null : ({ required: r.errRequired, phone: r.errPhone, parent: r.errParent, photo: r.errPhoto } as Record<string, string>)[c] ?? t.common.somethingWrong;
  const input = (k: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={k} className="field" value={v[k] ?? ""} aria-invalid={!!errors[k]} onChange={(e) => { setV((s) => ({ ...s, [k]: e.target.value })); setDone(false); }} {...extra} />
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();
    for (const [k, val] of Object.entries(v)) if (k !== "previous_shibirs") fd.set(k, String(val ?? ""));
    shibirs.forEach((s) => fd.append("previous_shibirs", s));
    if (photo) fd.set("photo", photo, "photo.jpg");
    const res = await fetch("/api/profile", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setErrors({}); setDone(true); router.refresh(); }
    else setErrors(data.errors ?? { form: "server" });
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-5">
      <div className="flex justify-center"><PhotoPicker existingUrl={`/api/photo/${photoKey}`} onChange={setPhoto} /></div>
      {errors.parent && <p role="alert" className="err">{msg(errors.parent)}</p>}
      <Field k="mother_name" label={r.motherName}>{input("mother_name")}</Field>
      <Field k="mother_phone" label={r.motherPhone} error={msg(errors.mother_phone)}>{input("mother_phone", { type: "tel", inputMode: "numeric" })}</Field>
      <Field k="father_name" label={r.fatherName}>{input("father_name")}</Field>
      <Field k="father_phone" label={r.fatherPhone} error={msg(errors.father_phone)}>{input("father_phone", { type: "tel", inputMode: "numeric" })}</Field>
      <Field k="own_phone" label={`${r.ownPhone} (${t.common.optional})`} error={msg(errors.own_phone)}>{input("own_phone", { type: "tel", inputMode: "numeric" })}</Field>
      <Field k="village" label={r.village} error={msg(errors.village)}>
        <Combobox id="village" value={v.village ?? ""} options={villages} placeholder={r.villageSearch} invalid={!!errors.village}
          addLabel={r.villageAdd} newHint={r.villageNew} onChange={(val) => { setV((s) => ({ ...s, village: val })); setDone(false); }} />
      </Field>
      <Field k="residence" label={r.residence} error={msg(errors.residence)}>{input("residence")}</Field>
      <Field k="sangh" label={r.sangh} error={msg(errors.sangh)}>
        <Combobox id="sangh" value={v.sangh ?? ""} options={sanghs} placeholder={r.sanghSearch} invalid={!!errors.sangh}
          addLabel={r.sanghAdd} newHint={r.sanghNew} normalize={normalizeSangh} onChange={(val) => { setV((s) => ({ ...s, sangh: val })); setDone(false); }} />
      </Field>
      <div>
        <p className="label">{r.gender}</p>
        <div className="grid grid-cols-2 gap-3">
          {([["M", r.male], ["F", r.female]] as const).map(([g, label]) => (
            <button key={g} type="button" aria-pressed={v.gender === g} disabled={genderLocked}
              onClick={() => { setV((s) => ({ ...s, gender: g })); setDone(false); }}
              className={`min-h-12 rounded-xl border-2 font-semibold ${v.gender === g ? "border-sage-500 bg-sage-50 text-sage-700" : "border-gold-100 bg-white"} ${genderLocked && v.gender !== g ? "opacity-40" : ""}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="hint">{r.genderFixed}</p>
      </div>
      <Field k="standard" label={r.standard} error={msg(errors.standard)}>
        <select id="standard" className="field" value={v.standard ?? ""} onChange={(e) => { setV((s) => ({ ...s, standard: e.target.value })); setDone(false); }}>
          <option value="">{r.standardPick}</option>
          {STANDARDS.map((n2) => <option key={n2} value={n2}>{standardLabel(n2, lang)}</option>)}
        </select>
      </Field>
      <Field k="dharmik_abhyas" label={r.abhyas} error={msg(errors.dharmik_abhyas)}>{input("dharmik_abhyas")}</Field>
      <div>
        <p className="label">{r.pathshala}</p>
        <div className="grid grid-cols-2 gap-3">
          {(["yes", "no"] as const).map((o) => (
            <button key={o} type="button" aria-pressed={v.pathshala === o} onClick={() => { setV((s) => ({ ...s, pathshala: o })); setDone(false); }}
              className={`min-h-12 rounded-xl border-2 font-semibold ${v.pathshala === o ? "border-sage-500 bg-sage-50 text-sage-700" : "border-gold-100 bg-white"}`}>
              {o === "yes" ? t.common.yes : t.common.no}
            </button>
          ))}
        </div>
      </div>
      {v.pathshala === "yes" && <Field k="pathshala_name" label={r.pathshalaWhich} error={msg(errors.pathshala_name)}>{input("pathshala_name")}</Field>}
      <Field k="previous_shibirs" label={r.previousShibir}>
        <MultiSelect id="previous_shibirs" options={PREVIOUS_SHIBIRS.map((s) => ({ value: s.code, label: s.label }))}
          value={shibirs} onChange={(next) => { setShibirs(next); setDone(false); }} placeholder={r.selectPlaceholder} />
        <p className="hint">{r.previousHint}</p>
      </Field>
      {errors.form && <p role="alert" className="err">{t.common.somethingWrong}</p>}
      <button type="submit" className="btn btn-gold w-full" disabled={busy}>{done ? `${t.profile.saved} ✓` : t.common.save}</button>
    </form>
  );
}
