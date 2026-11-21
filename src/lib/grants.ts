import "server-only";
import { one, query, tx } from "./db";

/** timestamptz → "2026-11-21T05:55:12Z" (parses identically everywhere) */
const iso = (col: string) => `to_char(${col} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export interface ActiveGrantRow {
  id: number;
  student_id: string;
  student_code: string;
  first_name: string;
  surname: string;
  days_back: number;
  expires_at: string;
  created_at: string;
  note: string | null;
  admin_name: string | null;
}

/** Gives a student a temporary unlock: the last `daysBack` days become editable for `hours` hours. */
export async function grantEdit(opts: { studentId: string; daysBack: number; hours: number; adminId: number; note?: string }) {
  const daysBack = Math.min(62, Math.max(1, Math.trunc(opts.daysBack)));
  const hours = Math.min(720, Math.max(1, Math.trunc(opts.hours)));
  return tx(async (q) => {
    // only one unlock is active at a time – a new one replaces the old
    await q.query(
      "update edit_grants set revoked_at = now() where student_id = $1 and revoked_at is null and expires_at > now()",
      [opts.studentId],
    );
    const rows = await q.query<{ id: number; expires_at: string }>(
      `insert into edit_grants (student_id, days_back, expires_at, granted_by, note)
       values ($1, $2, now() + ($3 || ' hours')::interval, $4, $5) returning id, ${iso("expires_at")} as expires_at`,
      [opts.studentId, daysBack, String(hours), opts.adminId, opts.note?.trim() || null],
    );
    return { ...rows[0], daysBack, hours };
  });
}

export async function revokeGrant(id: number) {
  await query("update edit_grants set revoked_at = now() where id = $1 and revoked_at is null", [id]);
}

export async function listActiveGrants(): Promise<ActiveGrantRow[]> {
  return query<ActiveGrantRow>(
    `select g.id, g.student_id, s.student_code, s.first_name, s.surname, g.days_back,
            ${iso("g.expires_at")} as expires_at, ${iso("g.created_at")} as created_at, g.note, a.name as admin_name
       from edit_grants g
       join students s on s.id = g.student_id
       left join admins a on a.id = g.granted_by
      where g.revoked_at is null and g.expires_at > now()
      order by g.expires_at`,
  );
}

export async function listGrantsFor(studentId: string, limit = 8) {
  return query<{
    id: number; days_back: number; created_at: string; expires_at: string; revoked_at: string | null;
    note: string | null; admin_name: string | null; active: boolean;
  }>(
    `select g.id, g.days_back, ${iso("g.created_at")} as created_at, ${iso("g.expires_at")} as expires_at,
            ${iso("g.revoked_at")} as revoked_at, g.note, a.name as admin_name,
            (g.revoked_at is null and g.expires_at > now()) as active
       from edit_grants g left join admins a on a.id = g.granted_by
      where g.student_id = $1 order by g.id desc limit ${Number(limit)}`,
    [studentId],
  );
}

export interface FoundStudent {
  id: string;
  student_code: string;
  first_name: string;
  surname: string;
  photo_key: string;
  sangh: string;
  residence: string;
  active: boolean;
  grant_id: number | null;
  grant_days: number | null;
  grant_expires: string | null;
}

/** Finds students by Student ID ("26-00001", "2600001", "00001", "1"), name or phone number. */
export async function searchStudents(q: string, limit = 20): Promise<FoundStudent[]> {
  const text = q.trim().slice(0, 80);
  if (!text) return [];
  const digits = text.replace(/\D/g, "").slice(0, 12);
  const params: unknown[] = [`%${text}%`];
  const conds = ["s.first_name || ' ' || s.surname ilike $1", "s.student_code ilike $1"];
  if (digits) {
    params.push(digits);
    const d = `$${params.length}`;
    // "26-00001" typed with or without the dash, or just the running number ("1", "00001")
    conds.push(`replace(s.student_code, '-', '') = ${d}`);
    conds.push(`split_part(s.student_code, '-', 2)::bigint = ${d}::bigint`);
  }
  if (digits.length >= 6) {
    params.push(`%${digits}%`);
    const p = `$${params.length}`;
    conds.push(`s.father_phone like ${p}`, `s.mother_phone like ${p}`, `s.own_phone like ${p}`);
  }
  return query<FoundStudent>(
    `select s.id, s.student_code, s.first_name, s.surname, s.photo_key, s.sangh, s.residence, s.active,
            g.id as grant_id, g.days_back as grant_days, ${iso("g.expires_at")} as grant_expires
       from students s
       left join lateral (
         select id, days_back, expires_at from edit_grants
          where student_id = s.id and revoked_at is null and expires_at > now()
          order by days_back desc, expires_at desc limit 1
       ) g on true
      where ${conds.map((c) => `(${c})`).join(" or ")}
      order by s.student_code limit ${Number(limit)}`,
    params,
  );
}

export async function getStudentIdByCode(code: string) {
  return one<{ id: string }>("select id from students where student_code = $1", [code]);
}
