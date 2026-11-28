// DEV ONLY: fills the local database with demo students and a few months of logs,
// so the leaderboard, filters and charts have something to show.
//   npm run seed:demo        (stop `npm run dev` first – the local DB allows one process at a time)
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { query } from "../src/lib/db";
import { addDays, todayIST } from "../src/lib/dates";

if (process.env.DATABASE_URL) {
  console.error("Refusing to seed demo data into a real DATABASE_URL.");
  process.exit(1);
}

const first = ["Aarav", "Dhruv", "Het", "Jay", "Krish", "Manan", "Parth", "Yash", "Riya", "Dhara", "Khushi", "Mansi", "Nidhi", "Prisha", "Shreya", "Vaishnavi", "Mahek", "Hetvi", "Om", "Smit"];
const last = ["Shah", "Mehta", "Gala", "Savla", "Doshi", "Vora", "Jain", "Nagda", "Furia", "Chheda"];
const sangh = ["Shree Dahisar Achalgachch Jain Sangh", "Shree Borivali Jain Sangh", "Kandivali Jain Sangh", "Malad Shwetambar Sangh"];
const residence = ["Dahisar", "Borivali", "Kandivali", "Malad"];
const village = ["Palitana", "Bhuj", "Mandvi", "Rajkot", "Surat"];

const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]) => a[rnd(a.length)];
const hash = await bcrypt.hash("1234", 8);
const today = todayIST();
const niyams = await query<{ id: number; type: string; points: number; points_per_unit: number }>(
  "select id, type, points, points_per_unit from niyams where active",
);
const options = await query<{ id: number; niyam_id: number; points: number; sort_order: number }>("select id, niyam_id, points, sort_order from niyam_options");

const photoDir = path.join(process.cwd(), ".data", "photos", "students");
fs.mkdirSync(photoDir, { recursive: true });
const palette = ["#e8a3ae", "#d4af61", "#9cc5a1", "#a9c3e8", "#f0b27a"];

for (let i = 0; i < 40; i++) {
  const fn = first[i % first.length];
  const sn = last[Math.floor(i / 4) % last.length];
  const key = `students/${randomUUID()}.jpg`;
  await sharp({ create: { width: 480, height: 480, channels: 3, background: palette[i % palette.length] } })
    .composite([{ input: Buffer.from(`<svg width="480" height="480"><circle cx="240" cy="190" r="90" fill="#fff" opacity=".85"/><rect x="110" y="300" width="260" height="180" rx="90" fill="#fff" opacity=".85"/></svg>`) }])
    .jpeg().toFile(path.join(process.cwd(), ".data", "photos", key));

  const code = `DEMO${String(i).padStart(2, "0")}`;
  const [{ id }] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, father_name, father_phone, residence, sangh,
        dharmik_abhyas, pathshala, pathshala_name, pin_hash, referral_code, created_at, previous_shibirs)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now() - ($15 || ' days')::interval, $16)
     on conflict (referral_code) do nothing returning id`,
    [fn, sn, key, `${2006 + rnd(9)}-0${1 + rnd(9)}-1${rnd(9)}`, pick(village), `${sn} Father`, `98${String(20000000 + i * 137).padStart(8, "0")}`,
     pick(residence), pick(sangh), pick(["2 Pratikraman", "Aryarakshit 2nd Dhoran", "Sutra 1"]), i % 3 !== 0, i % 3 !== 0 ? "Aryarakshit" : null,
     hash, code, String(rnd(120)), i % 5 === 0 ? "none" : pick(["jogeshwari", "deolali", "kutch-don", "deolali,kutch-pundi"])],
  );
  if (!id) continue;

  const engagement = 0.25 + Math.random() * 0.7; // how diligent this student is
  for (let d = 0; d < 110; d++) {
    if (Math.random() > engagement) continue;
    const date = addDays(today, -d);
    for (const n of niyams) {
      if (Math.random() > engagement) continue;
      let value = 1, points = n.points;
      if (n.type === "count") { value = 1 + rnd(3); points = value * n.points_per_unit; }
      const own = options.filter((o) => o.niyam_id === n.id);
      if (n.type === "choice") { const o = pick(own); value = o.id; points = o.points; }
      if (n.type === "multi") { const o = pick(own); value = 1 << (o.sort_order - 1); points = o.points; }
      await query(
        `insert into daily_logs (student_id, log_date, niyam_id, value, points) values ($1,$2,$3,$4,$5) on conflict do nothing`,
        [id, date, n.id, value, points],
      );
    }
  }
}

await query(
  `insert into donors (name, name_gu)
   select E'Matushri Maniben Kunvarji Ghela Bhai Nandu Parivar\\nHaste- Shrimati Sarojben Kishor Nandu\\nGaam- Pundi',
          E'માતુશ્રી મણીબેન કુંવર્જી ઘેલાભાઈ નંદુ પરિવાર\\nહ. શ્રીમતી સરોજબેન કિશોર નંદુ\\nગામ : પુનડી'
   where not exists (select 1 from donors)`,
  [],
);
console.log("Demo data ready. Demo students use PIN 1234 and phones starting 98200…");
process.exit(0);
