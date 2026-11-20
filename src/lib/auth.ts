import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { one, query } from "./db";

const STUDENT_COOKIE = "ns_session";
const ADMIN_COOKIE = "ns_admin";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret");
  }
  return new TextEncoder().encode(s);
}

/* ---------- phone / PIN helpers ---------- */

/** Keep the last 10 digits ("+91 98200 12345" → "9820012345"). Returns "" if it is not a valid number. */
export function normalizePhone(input: string | null | undefined): string {
  const digits = (input ?? "").replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : "";
}

export const isValidPin = (pin: unknown): pin is string => typeof pin === "string" && /^\d{4}$/.test(pin);

export const hashPin = (pin: string) => bcrypt.hash(pin, 10);
export const verifyPin = (pin: string, hash: string) => bcrypt.compare(pin, hash);

/* ---------- brute-force protection ---------- */

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function isLockedOut(phone: string): Promise<boolean> {
  const r = await one<{ n: number }>(
    `select count(*)::int as n from login_attempts
      where phone = $1 and at > now() - ($2 || ' minutes')::interval`,
    [phone, String(WINDOW_MINUTES)],
  );
  return (r?.n ?? 0) >= MAX_ATTEMPTS;
}
export async function recordFailedAttempt(phone: string) {
  await query("insert into login_attempts (phone) values ($1)", [phone]);
  await query("delete from login_attempts where at < now() - interval '1 day'");
}
export async function clearAttempts(phone: string) {
  await query("delete from login_attempts where phone = $1", [phone]);
}

/* ---------- student session ---------- */

export interface Student {
  id: string;
  first_name: string;
  surname: string;
  photo_key: string;
  dob: string;
  village: string;
  residence: string;
  sangh: string;
  referral_code: string;
  must_change_pin: boolean;
  created_at: string;
}

async function sign(payload: Record<string, unknown>, expires: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expires).sign(secret());
}

export async function startStudentSession(studentId: string, sessionVersion: number) {
  const token = await sign({ sid: studentId, sv: sessionVersion }, "10y");
  (await cookies()).set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TEN_YEARS,
  });
}

export async function endStudentSession() {
  (await cookies()).delete(STUDENT_COOKIE);
}

/** The logged-in student, or null. Cached per request. */
export const getStudent = cache(async (): Promise<Student | null> => {
  const token = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const s = await one<Student & { session_version: number; active: boolean }>(
      `select id, first_name, surname, photo_key, dob::text as dob, village, residence, sangh, referral_code,
              must_change_pin, created_at::text as created_at, session_version, active
         from students where id = $1`,
      [payload.sid],
    );
    if (!s || !s.active || s.session_version !== payload.sv) return null;
    return s;
  } catch {
    return null;
  }
});

/** Short-lived token used between "PIN matched several siblings" and "which one are you?". */
export const signPickToken = (ids: string[]) => sign({ pick: ids }, "5m");
export async function readPickToken(token: string): Promise<string[] | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return Array.isArray(payload.pick) ? (payload.pick as string[]) : null;
  } catch {
    return null;
  }
}

/* ---------- admin session ---------- */

export interface Admin {
  id: number;
  username: string;
  name: string;
}

export async function startAdminSession(adminId: number) {
  const token = await sign({ aid: adminId }, "30d");
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export const getAdmin = cache(async (): Promise<Admin | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await one<Admin>("select id, username, name from admins where id = $1", [payload.aid]);
  } catch {
    return null;
  }
});

/** Use at the top of every admin page / action. */
export async function requireAdmin(): Promise<Admin> {
  const a = await getAdmin();
  if (!a) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }
  return a!;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/** Use at the top of every student page (layouts do NOT block the page from rendering). */
export async function requireStudent(): Promise<Student> {
  const { redirect } = await import("next/navigation");
  const s = await getStudent();
  if (!s) redirect("/login");
  if (s!.must_change_pin) redirect("/change-pin");
  return s!;
}
