// Creates (or resets) an admin account.
//   npm run create-admin -- <username> <password> "<Display name>"
// Uses DATABASE_URL (Supabase) when set, otherwise the local dev database.
import bcrypt from "bcryptjs";
import { query } from "../src/lib/db";

const [username, password, ...rest] = process.argv.slice(2);
if (!username || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <username> <password (8+ chars)> "<Display name>"');
  process.exit(1);
}
const name = rest.join(" ") || username;
const hash = await bcrypt.hash(password, 10);
await query(
  `insert into admins (username, name, password_hash) values ($1, $2, $3)
   on conflict (username) do update set password_hash = excluded.password_hash, name = excluded.name`,
  [username.toLowerCase(), name, hash],
);
console.log(`Admin "${username.toLowerCase()}" is ready.`);
process.exit(0);
