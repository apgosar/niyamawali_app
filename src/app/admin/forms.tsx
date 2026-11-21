"use client";
import { useActionState, useState } from "react";
import {
  addAdmin, addBonus, adminLogin, changeOwnPassword, resetStudentPin, saveDonor, saveSettingsAction,
  type ActionState,
} from "./actions";

function Msg({ s }: { s: ActionState | null }) {
  if (!s) return null;
  if (s.error) return <p role="alert" className="err rounded-lg bg-red-50 p-2">{s.error}</p>;
  if (s.ok) return <p role="status" className="rounded-lg bg-sage-50 p-2 text-sm font-semibold text-sage-700">{s.ok}</p>;
  return null;
}

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="card space-y-4 p-6">
      <div><label className="label" htmlFor="username">Username</label><input id="username" name="username" className="field" autoComplete="username" autoCapitalize="none" required /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" className="field" autoComplete="current-password" required /></div>
      <Msg s={state} />
      <button className="btn btn-gold w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function ResetPinForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(resetStudentPin, null);
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Set a new temporary PIN for this student? They will be signed out on all devices.")) e.preventDefault(); }} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-ghost w-full" disabled={pending}>🔑 Reset PIN</button>
      <Msg s={state} />
      {state?.pin && (
        <div className="rounded-2xl border-2 border-dashed border-gold-500 bg-gold-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Temporary PIN</p>
          <p className="font-mono text-4xl font-bold tracking-[0.4em] text-gold-700">{state.pin}</p>
          <button type="button" className="mt-1 text-sm font-semibold text-gold-600"
            onClick={() => { navigator.clipboard?.writeText(state.pin!); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
          <p className="mt-1 text-xs text-muted">Shown only once.</p>
        </div>
      )}
    </form>
  );
}

export function BonusForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addBonus, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <input name="points" type="number" step="1" className="field" placeholder="±pts" required aria-label="Points" />
        <input name="note" className="field" placeholder="Reason (optional)" maxLength={200} aria-label="Reason" />
      </div>
      <Msg s={state} />
      <button className="btn btn-ghost w-full" disabled={pending}>Add / remove points</button>
    </form>
  );
}

export function DonorForm({ defaults }: { defaults: { month: string } }) {
  const [state, action, pending] = useActionState(saveDonor, null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="month">Month</label><input id="month" name="month" type="month" defaultValue={defaults.month} className="field" required /></div>
        <div><label className="label" htmlFor="name">Donor name</label><input id="name" name="name" className="field" maxLength={120} required /></div>
        <div><label className="label" htmlFor="message_gu">Message (Gujarati)</label><input id="message_gu" name="message_gu" className="field" maxLength={240} /></div>
        <div><label className="label" htmlFor="message_en">Message (English)</label><input id="message_en" name="message_en" className="field" maxLength={240} /></div>
      </div>
      <div><label className="label" htmlFor="photo">Photo / logo (optional)</label><input id="photo" name="photo" type="file" accept="image/*" className="field py-2" /></div>
      <p className="hint">Saving a month that already has a donor replaces it.</p>
      <Msg s={state} />
      <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Save donor"}</button>
    </form>
  );
}

export function SettingsForm({ values }: { values: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  return (
    <form action={action} className="space-y-4">
      <div><label className="label" htmlFor="edit_window_days">Edit window (days)</label>
        <input id="edit_window_days" name="edit_window_days" type="number" min={1} max={31} defaultValue={values.edit_window_days} className="field" />
        <p className="hint">Students can log today and the previous (N − 1) days. Default 3.</p></div>
      <div><label className="label" htmlFor="referral_bonus">Referral bonus (points each)</label>
        <input id="referral_bonus" name="referral_bonus" type="number" min={0} defaultValue={values.referral_bonus} className="field" /></div>
      <div><label className="label" htmlFor="referral_unlock_days">Referral unlocks after (days logged)</label>
        <input id="referral_unlock_days" name="referral_unlock_days" type="number" min={1} defaultValue={values.referral_unlock_days} className="field" />
        <p className="hint">The new student must log on this many different days before both get the bonus.</p></div>
      <div><label className="label" htmlFor="streak_bonuses">Streak bonuses</label>
        <input id="streak_bonuses" name="streak_bonuses" defaultValue={values.streak_bonuses} className="field" placeholder="7:50,21:100,51:200,108:500" />
        <p className="hint">days:points pairs, comma separated. Each is paid once per student. Leave empty to disable.</p></div>
      <div className="rounded-2xl border border-gold-100 bg-gold-50 p-3">
        <p className="mb-2 text-sm font-bold text-gold-700">Default for “Unlock editing”</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="grant_default_days">Days to unlock</label>
            <input id="grant_default_days" name="grant_default_days" type="number" min={1} max={62} defaultValue={values.grant_default_days} className="field" /></div>
          <div><label className="label" htmlFor="grant_default_hours">Open for (hours)</label>
            <input id="grant_default_hours" name="grant_default_hours" type="number" min={1} max={720} defaultValue={values.grant_default_hours} className="field" /></div>
        </div>
        <p className="hint">Pre-filled on the Unlock page; you can change it for each request.</p>
      </div>
      <Msg s={state} />
      <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}

export function AddAdminForm() {
  const [state, action, pending] = useActionState(addAdmin, null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="a_user">Username</label><input id="a_user" name="username" className="field" autoCapitalize="none" required /></div>
        <div><label className="label" htmlFor="a_name">Display name</label><input id="a_name" name="name" className="field" required /></div>
        <div><label className="label" htmlFor="a_pw">Password (8+)</label><input id="a_pw" name="password" type="password" className="field" minLength={8} autoComplete="new-password" required /></div>
      </div>
      <Msg s={state} />
      <button className="btn btn-gold" disabled={pending}>Add admin</button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="cp_cur">Current password</label><input id="cp_cur" name="current" type="password" className="field" autoComplete="current-password" required /></div>
        <div><label className="label" htmlFor="cp_new">New password (8+)</label><input id="cp_new" name="next" type="password" className="field" minLength={8} autoComplete="new-password" required /></div>
      </div>
      <Msg s={state} />
      <button className="btn btn-ghost" disabled={pending}>Change my password</button>
    </form>
  );
}
