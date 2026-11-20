import "server-only";
import { randomInt } from "node:crypto";
import { one, query } from "./db";

// No 0/O/1/I/L – easy to read out loud and type on a phone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(len = 6): string {
  return Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    if (!(await one("select 1 from students where referral_code = $1", [code]))) return code;
  }
  return randomCode(8);
}

export const normalizeCode = (c: string | null | undefined) => (c ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function findReferrer(code: string) {
  const c = normalizeCode(code);
  if (c.length < 4) return null;
  return one<{ id: string; first_name: string; surname: string; photo_key: string }>(
    "select id, first_name, surname, photo_key from students where referral_code = $1 and active",
    [c],
  );
}

export async function referralsOf(studentId: string) {
  return query<{ first_name: string; surname: string; status: string; created_at: string }>(
    `select s.first_name, s.surname, r.status, r.created_at::text as created_at
       from referrals r join students s on s.id = r.referee_id
      where r.referrer_id = $1 order by r.created_at desc`,
    [studentId],
  );
}
