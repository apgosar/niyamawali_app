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
import { todayIST, isValidMonth } from "@/lib/dates";

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

async function recalcNiyam(id: number) {
  await query(
    `update daily_logs l set points = n.points from niyams n
      where l.niyam_id = n.id and n.id = $1 and n.type = 'boolean'`, [id]);
  await query(
    `update daily_logs l set points = l.value * n.points_per_unit from niyams n
      where l.niyam_id = n.id and n.id = $1 and n.type = 'count'`, [id]);
  await query(
    `update daily_logs l set points = o.points from niyam_options o
      where l.niyam_id = $1 and o.niyam_id = l.niyam_id and o.id = l.value`, [id]);
}

export async function updateNiyam(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  await query(
    `update niyams set name_gu = $2, name_en = $3, sort_order = $4, active = $5,
            points = $6, points_per_unit = $7, max_count = $8 where id = $1`,
    [id, s(fd, "name_gu"), s(fd, "name_en"), int(fd, "sort_order"), fd.get("active") === "on",
     Math.max(0, int(fd, "points")), Math.max(0, int(fd, "points_per_unit")), Math.max(1, int(fd, "max_count", 10))],
  );
  if (fd.get("recalc") === "on") await recalcNiyam(id);
  revalidatePath("/admin/niyams");
  redirect(`/admin/niyams?saved=${id}`);
}

export async function addNiyam(fd: FormData) {
  await requireAdmin();
  const type = s(fd, "type", 10);
  if (!["boolean", "count"].includes(type)) redirect("/admin/niyams");
  const max = await one<{ m: number }>("select coalesce(max(sort_order),0)::int as m from niyams");
  await query(
    `insert into niyams (sort_order, name_gu, name_en, type, points, points_per_unit, max_count)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [(max?.m ?? 0) + 1, s(fd, "name_gu") || s(fd, "name_en"), s(fd, "name_en") || s(fd, "name_gu"), type,
     type === "boolean" ? Math.max(0, int(fd, "points", 10)) : 0,
     type === "count" ? Math.max(0, int(fd, "points", 10)) : 0, 10],
  );
  revalidatePath("/admin/niyams");
  redirect("/admin/niyams?added=1");
}

export async function updateOption(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const row = await one<{ niyam_id: number }>(
    `update niyam_options set label_gu = $2, label_en = $3, points = $4, active = $5
      where id = $1 returning niyam_id`,
    [id, s(fd, "label_gu"), s(fd, "label_en"), Math.max(0, int(fd, "points")), fd.get("active") === "on"],
  );
  if (row && fd.get("recalc") === "on") await recalcNiyam(row.niyam_id);
  revalidatePath("/admin/niyams");
  redirect(`/admin/niyams?saved=o${id}`);
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
  const edit = int(fd, "edit_window_days");
  const bonus = int(fd, "referral_bonus");
  const unlock = int(fd, "referral_unlock_days");
  const streaks = s(fd, "streak_bonuses", 200);
  if (edit < 1 || edit > 31) return { error: "Edit window must be between 1 and 31 days." };
  if (bonus < 0) return { error: "Referral bonus cannot be negative." };
  if (unlock < 1) return { error: "Referral unlock must be at least 1 day." };
  const parsed = parseStreakBonuses(streaks);
  if (streaks && !parsed.length) return { error: "Streak bonuses look like 7:50,21:100 (days:points, comma separated)." };
  await saveSettings({
    edit_window_days: String(edit),
    referral_bonus: String(bonus),
    referral_unlock_days: String(unlock),
    streak_bonuses: parsed.map((b) => `${b.days}:${b.points}`).join(","),
  });
  revalidatePath("/admin/settings");
  return { ok: "Settings saved." };
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
