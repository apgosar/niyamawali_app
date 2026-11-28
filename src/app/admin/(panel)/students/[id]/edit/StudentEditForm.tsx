"use client";
import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { PhotoPicker } from "@/components/PhotoPicker";
import { MultiSelect } from "@/components/MultiSelect";
import { Combobox } from "@/components/Combobox";
import { normalizeSangh } from "@/lib/village-text";
import { NO_SHIBIR, PREVIOUS_SHIBIRS, STANDARDS, pickShibirs, shibirSelection, standardLabel } from "@/lib/profile-options";
import { saveStudentProfile } from "../../../../actions";

interface Props {
  id: string;
  initial: Record<string, string>;
  photoKey: string;
  villages: string[];
  sanghs: string[];
}

const MESSAGES: Record<string, string> = {
  required: "This is required.",
  phone: "Enter a 10-digit mobile number.",
  name: "First name cannot contain spaces.",
  dob: "Enter a valid date of birth.",
  photo: "That photo could not be used. Choose another one.",
};
const FORM_MESSAGES: Record<string, string> = {
  exists: "Another student already has this name and date of birth.",
  missing: "Student not found.",
  server: "Could not save. Please try again.",
};

function Field({ k, label, hint, error, children }: { k: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      {children}
      {error ? <p role="alert" className="err">{MESSAGES[error] ?? "Please check this."}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function StudentEditForm({ id, initial, photoKey, villages, sanghs }: Props) {
  const [state, action, pending] = useActionState(saveStudentProfile, null);
  const [v, setV] = useState(initial);
  const [shibirs, setShibirs] = useState<string[]>(shibirSelection(initial.previous_shibirs));
  const [photo, setPhoto] = useState<Blob | null>(null);
  const errors = state?.errors ?? {};

  const set = (k: string, value: string) => setV((s) => ({ ...s, [k]: value }));
  const input = (k: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={k} name={k} className="field" value={v[k] ?? ""} aria-invalid={!!errors[k]} autoComplete="off" onChange={(e) => set(k, e.target.value)} {...extra} />
  );

  // submitted by hand so that React keeps what was typed when the server sends back an error
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", id);
    for (const [k, val] of Object.entries(v)) if (k !== "previous_shibirs") fd.set(k, val);
    shibirs.forEach((s) => fd.append("previous_shibirs", s));
    if (photo) fd.set("photo", photo, "photo.jpg");
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <section className="card space-y-4 p-4">
        <h2 className="text-lg font-bold text-gold-700">Student</h2>
        <div className="flex flex-col items-center">
          <PhotoPicker existingUrl={`/api/photo/${photoKey}`} onChange={setPhoto} invalid={!!errors.photo} />
          {errors.photo && <p role="alert" className="err">{MESSAGES.photo}</p>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="first_name" label="First name" error={errors.first_name}>{input("first_name")}</Field>
          <Field k="surname" label="Surname" error={errors.surname}>{input("surname")}</Field>
          <Field k="dob" label="Date of birth" error={errors.dob}>{input("dob", { type: "date", min: "1930-01-01" })}</Field>
          <Field k="gender" label="Gender" error={errors.gender} hint="Changing it also changes the M / F in the Student ID.">
            <select id="gender" className="field" value={v.gender ?? ""} aria-invalid={!!errors.gender} onChange={(e) => set("gender", e.target.value)}>
              {!initial.gender && <option value="">Not given</option>}
              <option value="M">Male (M)</option>
              <option value="F">Female (F)</option>
            </select>
          </Field>
          <Field k="village" label="Village" error={errors.village}>
            <Combobox id="village" value={v.village ?? ""} options={villages} placeholder="Type to search" invalid={!!errors.village}
              addLabel="Add" newHint="New village: it will be added to the list." onChange={(val) => set("village", val)} />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="text-lg font-bold text-gold-700">Family and phone numbers</h2>
        <p className="hint">At least one parent’s name and number is required. The student logs in with any of these numbers.</p>
        {errors.parent && <p role="alert" className="err">Enter at least one parent’s name and mobile number.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="mother_name" label="Mother’s name" error={errors.mother_name}>{input("mother_name")}</Field>
          <Field k="mother_phone" label="Mother’s mobile" error={errors.mother_phone}>{input("mother_phone", { type: "tel", inputMode: "numeric" })}</Field>
          <Field k="father_name" label="Father’s name" error={errors.father_name}>{input("father_name")}</Field>
          <Field k="father_phone" label="Father’s mobile" error={errors.father_phone}>{input("father_phone", { type: "tel", inputMode: "numeric" })}</Field>
          <Field k="own_phone" label="Student’s own mobile (optional)" error={errors.own_phone}>{input("own_phone", { type: "tel", inputMode: "numeric" })}</Field>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="text-lg font-bold text-gold-700">Dharmik and school details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="residence" label="Residence" error={errors.residence}>{input("residence")}</Field>
          <Field k="sangh" label="Sangh" error={errors.sangh}>
            <Combobox id="sangh" value={v.sangh ?? ""} options={sanghs} placeholder="Type to search" invalid={!!errors.sangh}
              addLabel="Add" newHint="New Sangh: it will be added to the list." normalize={normalizeSangh} onChange={(val) => set("sangh", val)} />
          </Field>
          <Field k="standard" label="Current standard" error={errors.standard}>
            <select id="standard" className="field" value={v.standard ?? ""} onChange={(e) => set("standard", e.target.value)}>
              <option value="">Not given</option>
              {STANDARDS.map((n) => <option key={n} value={n}>{standardLabel(n, "en")}</option>)}
            </select>
          </Field>
          <Field k="dharmik_abhyas" label="Dharmik abhyas" error={errors.dharmik_abhyas}>{input("dharmik_abhyas")}</Field>
          <Field k="pathshala" label="Goes to Pathshala?" error={errors.pathshala}>
            <select id="pathshala" className="field" value={v.pathshala ?? "no"} onChange={(e) => set("pathshala", e.target.value)}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
          {v.pathshala === "yes" && <Field k="pathshala_name" label="Which Pathshala?" error={errors.pathshala_name}>{input("pathshala_name")}</Field>}
          <Field k="previous_shibirs" label="Previous Divine Sanskar Shibir attended" error={errors.previous_shibirs}
            hint="Decides ranking: “None of the above” is not ranked and loses the Top 10 badge.">
            <MultiSelect id="previous_shibirs" invalid={!!errors.previous_shibirs}
              options={[...PREVIOUS_SHIBIRS.map((s) => ({ value: s.code as string, label: s.label as string })), { value: NO_SHIBIR, label: "None of the above" }]}
              value={shibirs} onChange={(next) => setShibirs((before) => pickShibirs(before, next))} placeholder="Select…" />
          </Field>
        </div>
      </section>

      {errors.form && <p role="alert" className="err rounded-lg bg-red-50 p-3">{FORM_MESSAGES[errors.form] ?? FORM_MESSAGES.server}</p>}
      {!errors.form && Object.keys(errors).length > 0 && <p role="alert" className="err rounded-lg bg-red-50 p-3">Not saved. Please correct the marked fields.</p>}
      <div className="flex gap-3">
        <Link href={`/admin/students/${id}`} className="btn btn-ghost flex-1">Cancel</Link>
        <button type="submit" className="btn btn-gold flex-[2]" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
