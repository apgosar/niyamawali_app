"use server";
import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, query } from "@/lib/db";
import {
  clearAttempts, endAdminSession, hashPassword, hashPin, isLockedOut, recordFailedAttempt,
  requireAdmin, startAdminSession, verifyPassword,
} from "@/lib/auth";
import { deletePhoto, savePhoto } from "@/lib/storage";
import { saveSettings } from "@/lib/settings";
import { parseStreakBonuses } from "@/lib/streaks";
import { todayIST, isValidMonth, fmtIST } from "@/lib/dates";
import { grantEdit, revokeGrant } from "@/lib/grants";
import { addNiyamRow, EditError, saveNiyamEdits, type NiyamEdit, type OptionEdit } from "@/lib/niyams-admin";

export interface ActionState { error?: string; ok?: string; pin?: string }

const s = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);
const int = (fd: FormData, k: string, fallback = 0) => {
  const n = Number(fd.get(k));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

/* ---------------- session ---------------- */

export async function adminLogin(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  const username = s(fd, "username", 60).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const key = `admin:${username}`;
  if (!username || !password) return { error: "Enter username and password." };
  if (await isLockedOut(key)) return { error: "Too many attempts. Try again in 15 minutes." };
  const a = await one<{ id: number; password_hash: string }>("select id, password_hash from admins where username = $1", [username]);
  if (!a || !(await verifyPassword(password, a.password_hash))) {
    await recordFailedAttempt(key);
    return { error: "Wrong username or password." };
  }
  await clearAttempts(key);
  await startAdminSession(a.id);
  redirect("/admin");
}

export async function adminLogout() {
  await endAdminSession();
  redirect("/admin/login");
}

/* ---------------- students ---------------- */

/** Sets a random temporary PIN; the student must pick a new one at next login. */
export async function resetStudentPin(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = s(fd, "id", 40);
  const pin = String(randomInt(0, 10000)).padStart(4, "0");
  const rows = await query(
    `update students set pin_hash = $2, must_change_pin = true, session_version = session_version + 1
      where id = $1 returning id`,
    [id, await hashPin(pin)],
  );
  if (!rows.length) return { error: "Student not found." };
  revalidatePath(`/admin/students/${id}`);
  return { ok: "Temporary PIN set. Share it with the family — they will be asked to choose a new one.", pin };
}

export async function toggleStudentActive(fd: FormData) {
  await requireAdmin();
  const id = s(fd, "id", 40);
  await query("update students set active = not active, session_version = session_version + 1 where id = $1", [id]);
  revalidatePath(`/admin/students/${id}`);
}

export async function addBonus(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = s(fd, "id", 40);
  const points = int(fd, "points");
  const note = s(fd, "note", 200);
  if (!points) return { error: "Enter a non-zero number of points (use a minus sign to remove)." };
  if (Math.abs(points) > 100000) return { error: "That is too large." };
  await query(
    "insert into bonus_points (student_id, awarded_on, kind, points, note) values ($1, $2, 'manual', $3, $4)",
    [id, todayIST(), points, note || (points > 0 ? "Bonus from admin" : "Adjustment by admin")],
  );
  revalidatePath(`/admin/students/${id}`);
  return { ok: `${points > 0 ? "+" : ""}${points} points recorded.` };
}

export async function deleteBonus(fd: FormData) {
  await requireAdmin();
  const id = s(fd, "id", 40);
  // Only manual adjustments can be removed; automatic awards are protected.
  await query("delete from bonus_points where id = $1 and kind = 'manual'", [int(fd, "bonusId")]);
  revalidatePath(`/admin/students/${id}`);
}

/* ---------------- niyams ---------------- */

/** Save every niyam and option on the page in one go (no redirect, so the page keeps its scroll position). */
export async function saveNiyamsAction(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const ids = (k: string) => String(fd.get(k) ?? "").split(",").map(Number).filter((n) => Number.isInteger(n));
  const num = (k: string) => (fd.has(k) ? Number(fd.get(k)) : undefined);
  const niyams: NiyamEdit[] = ids("ids").map((id) => ({
    id,
    sort_order: Number(fd.get(`n${id}_sort`)),
    name_gu: s(fd, `n${id}_gu`),
    name_en: s(fd, `n${id}_en`),
    active: fd.get(`n${id}_active`) === "on",
    points: num(`n${id}_points`),
    points_per_unit: num(`n${id}_ppu`),
    max_count: num(`n${id}_max`),
  }));
  const options: OptionEdit[] = ids("opt_ids").map((id) => ({
    id,
    label_gu: s(fd, `o${id}_gu`),
    label_en: s(fd, `o${id}_en`),
    points: Number(fd.get(`o${id}_points`)),
    active: fd.get(`o${id}_active`) === "on",
  }));
  try {
    const r = await saveNiyamEdits(niyams, options, fd.get("rescore") === "on");
    revalidatePath("/admin/niyams");
    if (r.changed === 0) return { ok: "Nothing to save — no changes were made." };
    return { ok: `Saved ✓ ${r.changed} change${r.changed === 1 ? "" : "s"}${r.rescored ? `, past entries re-scored for ${r.rescored} niyam${r.rescored === 1 ? "" : "s"}` : ""}.` };
  } catch (e) {
    if (e instanceof EditError) return { error: e.message };
    console.error("saveNiyams failed", e);
    return { error: "Could not save. Please try again." };
  }
}

export async function addNiyamAction(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const type = s(fd, "type", 10);
  if (type !== "boolean" && type !== "count") return { error: "Pick a type." };
  try {
    const no = await addNiyamRow({ name_gu: s(fd, "name_gu"), name_en: s(fd, "name_en"), type, points: Math.max(0, int(fd, "points", 10)) });
    revalidatePath("/admin/niyams");
    return { ok: `Added as niyam ${no}. Scroll up to see it at the end of the list.` };
  } catch (e) {
    if (e instanceof EditError) return { error: e.message };
    console.error("addNiyam failed", e);
    return { error: "Could not add. Please try again." };
  }
}

/* ---------------- donors ---------------- */

export async function saveDonor(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const month = s(fd, "month", 7);
  const name = s(fd, "name", 120);
  if (!isValidMonth(month)) return { error: "Pick a month." };
  if (!name) return { error: "Enter the donor's name." };
  const existing = await one<{ photo_key: string | null }>("select photo_key from donors where month = $1", [month]);
  let photoKey = existing?.photo_key ?? null;
  const file = fd.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { error: "Photo is too large (max 5 MB)." };
    try {
      const key = await savePhoto(Buffer.from(await file.arrayBuffer()), "donors");
      await deletePhoto(photoKey);
      photoKey = key;
    } catch {
      return { error: "That file is not a valid image." };
    }
  }
  await query(
    `insert into donors (month, name, photo_key, message_gu, message_en) values ($1,$2,$3,$4,$5)
     on conflict (month) do update set name = excluded.name, photo_key = excluded.photo_key,
       message_gu = excluded.message_gu, message_en = excluded.message_en`,
    [month, name, photoKey, s(fd, "message_gu", 240) || null, s(fd, "message_en", 240) || null],
  );
  revalidatePath("/admin/donors");
  return { ok: `Donor saved for ${month}.` };
}

export async function deleteDonor(fd: FormData) {
  await requireAdmin();
  const month = s(fd, "month", 7);
  const d = await one<{ photo_key: string | null }>("delete from donors where month = $1 returning photo_key", [month]);
  await deletePhoto(d?.photo_key);
  revalidatePath("/admin/donors");
}

/* ---------------- settings & admins ---------------- */

export async function saveSettingsAction(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const referralsOn = fd.get("referrals_enabled") === "on";
  const edit = int(fd, "edit_window_days");
  const bonus = int(fd, "referral_bonus");
  const unlock = int(fd, "referral_unlock_days");
  const streaks = s(fd, "streak_bonuses", 200);
  const gDays = int(fd, "grant_default_days");
  const gHours = int(fd, "grant_default_hours");
  if (edit < 1 || edit > 31) return { error: "Edit window must be between 1 and 31 days." };
  if (bonus < 0) return { error: "Referral bonus cannot be negative." };
  if (unlock < 1) return { error: "Referral unlock must be at least 1 day." };
  if (gDays < 1 || gDays > 62) return { error: "Default unlock days must be between 1 and 62." };
  if (gHours < 1 || gHours > 720) return { error: "Default unlock hours must be between 1 and 720." };
  const parsed = parseStreakBonuses(streaks);
  if (streaks && !parsed.length) return { error: "Streak bonuses look like 7:50,21:100 (days:points, comma separated)." };
  await saveSettings({
    referrals_enabled: referralsOn ? "1" : "0",
    edit_window_days: String(edit),
    referral_bonus: String(bonus),
    referral_unlock_days: String(unlock),
    streak_bonuses: parsed.map((b) => `${b.days}:${b.points}`).join(","),
    grant_default_days: String(gDays),
    grant_default_hours: String(gHours),
  });
  revalidatePath("/admin/settings");
  return { ok: referralsOn ? "Settings saved. Referrals are ON." : "Settings saved. Referrals are OFF." };
}

export async function addAdmin(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const username = s(fd, "username", 40).toLowerCase();
  const name = s(fd, "name", 80);
  const password = String(fd.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,}$/.test(username)) return { error: "Username: at least 3 letters/numbers (no spaces)." };
  if (!name) return { error: "Enter a display name." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (await one("select 1 from admins where username = $1", [username])) return { error: "That username is taken." };
  await query("insert into admins (username, name, password_hash) values ($1,$2,$3)", [username, name, await hashPassword(password)]);
  revalidatePath("/admin/admins");
  return { ok: `Admin “${username}” created.` };
}

export async function deleteAdmin(fd: FormData) {
  const me = await requireAdmin();
  const id = int(fd, "id");
  const count = await one<{ n: number }>("select count(*)::int as n from admins");
  if (id === me.id || (count?.n ?? 0) <= 1) return; // never lock everyone out
  await query("delete from admins where id = $1", [id]);
  revalidatePath("/admin/admins");
}

export async function changeOwnPassword(_prev: ActionState | null, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const cur = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const row = await one<{ password_hash: string }>("select password_hash from admins where id = $1", [me.id]);
  if (!row || !(await verifyPassword(cur, row.password_hash))) return { error: "Current password is wrong." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  await query("update admins set password_hash = $2 where id = $1", [me.id, await hashPassword(next)]);
  return { ok: "Password changed." };
}

/* ---------------- edit unlocks (boarding / hostel students, corrections) ---------------- */

/** Only ever send the admin back to another admin page. */
function backPath(fd: FormData) {
  const b = String(fd.get("back") ?? "");
  return b.startsWith("/admin") && !b.startsWith("//") ? b : "/admin/unlock";
}
function withMsg(path: string, key: "ok" | "err", msg: string) {
  const u = new URL(path, "http://local");
  u.searchParams.delete("ok");
  u.searchParams.delete("err");
  u.searchParams.set(key, msg);
  return u.pathname + u.search;
}

export async function grantEditAction(fd: FormData) {
  const admin = await requireAdmin();
  const back = backPath(fd);
  const id = s(fd, "id", 40);
  const days = int(fd, "days");
  const hours = int(fd, "hours");
  if (days < 1 || days > 62) redirect(withMsg(back, "err", "Days must be between 1 and 62."));
  if (hours < 1 || hours > 720) redirect(withMsg(back, "err", "Hours must be between 1 and 720."));
  const st = /^[0-9a-f-]{36}$/i.test(id)
    ? await one<{ student_code: string; first_name: string }>("select student_code, first_name from students where id = $1", [id])
    : null;
  if (!st) redirect(withMsg(back, "err", "Student not found."));
  const g = await grantEdit({ studentId: id, daysBack: days, hours, adminId: admin.id, note: s(fd, "note", 200) });
  revalidatePath("/admin/unlock");
  revalidatePath(`/admin/students/${id}`);
  redirect(withMsg(back, "ok", `Unlocked ${st!.student_code} (${st!.first_name}) – last ${g.daysBack} days, until ${fmtIST(new Date(g.expires_at).toISOString())}.`));
}

export async function revokeGrantAction(fd: FormData) {
  await requireAdmin();
  const back = backPath(fd);
  await revokeGrant(int(fd, "grantId"));
  revalidatePath("/admin/unlock");
  redirect(withMsg(back, "ok", "Unlock removed. The days are locked again."));
}
