import "server-only";
import { query, type Queryable } from "./db";
import { findExact, normalizeSangh } from "./village-text";

/** All Sanghs, A to Z. */
export async function listSanghs(): Promise<string[]> {
  return (await query<{ name: string }>("select name from sanghs order by lower(name)")).map((r) => r.name);
}

/**
 * The Sangh to store for what a student typed.
 *  - already on the list (any capitalisation / spacing / commas) → the list's own spelling
 *  - new → added to the list for everyone, then returned
 * Pass a transaction as `q` to make the addition part of it.
 */
export async function resolveSangh(q: Queryable, typed: string): Promise<string> {
  const name = normalizeSangh(typed);
  if (name.length < 2) throw new Error("sangh too short");
  const find = async () => findExact((await q.query<{ name: string }>("select name from sanghs")).map((r) => r.name), name);
  const existing = await find();
  if (existing) return existing;
  await q.query("insert into sanghs (name, source) values ($1, 'student') on conflict do nothing", [name]);
  return (await find()) ?? name;
}

/** Convenience for code that is not inside a transaction. */
export const resolveSanghNow = (typed: string) => resolveSangh({ query }, typed);
