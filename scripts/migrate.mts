// Applies supabase/migrations/*.sql and supabase/seed.sql to DATABASE_URL.
// Usage:  DATABASE_URL=postgres://... npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to your Supabase Postgres connection string first.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const root = process.cwd();

const migrations = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of migrations) {
  console.log("Applying", file);
  await sql.unsafe(fs.readFileSync(path.join(root, "supabase", "migrations", file), "utf8"));
}
console.log("Seeding niyams and settings (only if empty)");
await sql.unsafe(fs.readFileSync(path.join(root, "supabase", "seed.sql"), "utf8"));
await sql.end();
console.log("Done.");
