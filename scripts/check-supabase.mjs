// Verifies Supabase DB + private Storage bucket using the same env vars the app uses. Prints no secrets.
import postgres from "postgres";
import sharp from "sharp";

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET = "photos" } = process.env;
const out = (k, v) => console.log(k.padEnd(34), v);

// --- database ---
const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });
const t = await sql`select count(*)::int as n from niyams`;
const tables = await sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`;
const settings = await sql`select count(*)::int as n from settings`;
out("DB niyams rows:", t[0].n);
out("DB public tables:", tables[0].n);
out("DB settings rows:", settings[0].n);
await sql.end();

// --- storage ---
const headers = SUPABASE_SERVICE_KEY.startsWith("eyJ")
  ? { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  : { apikey: SUPABASE_SERVICE_KEY };
const key = `students/00000000-0000-0000-0000-00000000c0de.jpg`;
const url = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${key}`;
const img = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#d4af61" } }).jpeg().toBuffer();

const up = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: new Uint8Array(img) });
out("Storage upload:", `${up.status} ${up.ok ? "OK" : await up.text()}`);
const down = await fetch(url, { headers });
out("Storage download (private bucket):", `${down.status} ${down.ok ? "OK, " + (await down.arrayBuffer()).byteLength + " bytes" : await down.text()}`);
const anon = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${key}`);
out("Public URL without key (must fail):", `${anon.status} ${anon.status === 200 ? "!! BUCKET IS PUBLIC" : "private, good"}`);
const del = await fetch(url, { method: "DELETE", headers });
out("Storage delete:", `${del.status} ${del.ok ? "OK" : await del.text()}`);
