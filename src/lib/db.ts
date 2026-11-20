import fs from "node:fs";
import path from "node:path";

/**
 * Tiny database layer.
 *  - Production (Supabase Postgres): set DATABASE_URL  → `postgres` (postgres.js) driver.
 *  - Local development (no setup):   leave DATABASE_URL empty → embedded PGlite in ./.data/pglite
 * Queries are plain SQL with $1, $2 … placeholders, so both drivers behave the same.
 * Cast aggregates in SQL (e.g. `count(*)::int`) so numbers come back as JS numbers.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}
export interface Db extends Queryable {
  tx<R>(fn: (q: Queryable) => Promise<R>): Promise<R>;
}

const ROOT = process.cwd();

function readSql(...parts: string[]) {
  // Dev-only path (production uses DATABASE_URL), so keep it out of the deploy trace.
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ ROOT, ...parts), "utf8");
}

async function createPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  // PGLITE_DIR=memory:// gives a throw-away in-memory database (used by the tests).
  const dir = process.env.PGLITE_DIR || path.join(/*turbopackIgnore: true*/ ROOT, ".data", "pglite");
  if (!dir.startsWith("memory:")) fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;
  await pg.exec(readSql("supabase", "migrations", "0001_init.sql"));
  await pg.exec(readSql("supabase", "seed.sql"));
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await pg.query(text, params);
      return res.rows as T[];
    },
    async tx<R>(fn: (q: Queryable) => Promise<R>) {
      return pg.transaction(async (t) =>
        fn({
          async query<T>(text: string, params: unknown[] = []) {
            const res = await t.query(text, params);
            return res.rows as T[];
          },
        }),
      );
    },
  };
}

async function createPostgres(url: string): Promise<Db> {
  const postgres = (await import("postgres")).default;
  // Supabase's transaction pooler needs prepare:false, and it hangs if several queries are pipelined down one
  // connection at once (e.g. Promise.all) – so max_pipeline:1 = one in-flight query per connection.
  const sql = postgres(url, { prepare: false, max: 3, max_pipeline: 1, idle_timeout: 20 });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await sql.unsafe(text, params as any[]);
      return rows as unknown as T[];
    },
    async tx<R>(fn: (q: Queryable) => Promise<R>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await sql.begin(async (t: any) =>
        fn({
          async query<T>(text: string, params: unknown[] = []) {
            const rows = await t.unsafe(text, params);
            return rows as unknown as T[];
          },
        }),
      )) as R;
    },
  };
}

const g = globalThis as unknown as { __niyamDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__niyamDb) {
    // NIYAM_LOCAL=1 forces the embedded database even if .env.local points at Supabase (safe testing).
    const url = process.env.NIYAM_LOCAL ? undefined : process.env.DATABASE_URL;
    g.__niyamDb = url ? createPostgres(url) : createPglite();
  }
  return g.__niyamDb;
}

/** Convenience helpers. */
export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await getDb()).query<T>(text, params);
}
export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
export async function tx<R>(fn: (q: Queryable) => Promise<R>): Promise<R> {
  return (await getDb()).tx(fn);
}
