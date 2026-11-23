import "server-only";
import { query, type Queryable } from "./db";
import { normalizeVillage } from "./village-text";

/** All villages, A to Z. */
export async function listVillages(): Promise<string[]> {
  return (await query<{ name: string }>("select name from villages order by lower(name)")).map((r) => r.name);
}

/**
 * The village to store for what a student typed.
 *  - already on the list (any capitalisation / spacing) → the list's own spelling
 *  - new → added to the list for everyone, then returned
 * Pass a transaction as `q` to make the addition part of it.
 */
export async function resolveVillage(q: Queryable, typed: string): Promise<string> {
  const name = normalizeVillage(typed);
  if (name.length < 2) throw new Error("village too short");
  const find = async () => (await q.query<{ name: string }>("select name from villages where lower(name) = lower($1)", [name]))[0]?.name;
  const existing = await find();
  if (existing) return existing;
  await q.query("insert into villages (name, source) values ($1, 'student') on conflict do nothing", [name]);
  return (await find()) ?? name;
}

/** Convenience for code that is not inside a transaction. */
export const resolveVillageNow = (typed: string) => resolveVillage({ query }, typed);
