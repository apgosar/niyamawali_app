# Niyamawali – Divine Sanskar Shibir

A mobile-first, installable web app (PWA) where students log their 30 daily niyams, earn points, climb a monthly
leaderboard and share an invite link. Gujarati ⇄ English switch, spiritual gold/cream theme taken from the logo.
Includes an admin panel (points, students, filters, leaderboard, donors, stats).

**Stack:** Next.js 16 (App Router) · Tailwind CSS 4 · PostgreSQL (Supabase) · Supabase Storage (photos) · Vercel.

---

## 1. Run it on your computer (no accounts needed)

```powershell
npm install
npm run create-admin -- admin "ChooseAStrongPassword" "Your Name"
npm run dev
```

Open <http://localhost:3000> (students) and <http://localhost:3000/admin> (admin).
With no `DATABASE_URL`, data lives in `./.data` (embedded Postgres + photo files) – delete that folder to start fresh.

Optional demo data (40 students, 3 months of logs, a donor) – stop `npm run dev` first, then:

```powershell
npm run seed:demo      # demo students use PIN 1234 and phones 98200xxxxx
```

Other commands: `npm test` (unit + integration tests), `npm run build`, `npm run icons` (re-generate PWA icons from `logo.jpeg`).

---

## 2. Put it online (free tiers are enough to start)

### a) Supabase (database + photo storage)
1. Create a project at <https://supabase.com> (choose the Mumbai region for speed in India).
2. **Database:** Project Settings → Database → *Connection string* → copy the **Transaction pooler** URI
   (port 6543) and put your DB password in it. This is your `DATABASE_URL`.
3. **Create the tables** from your computer (once):
   ```powershell
   $env:DATABASE_URL = "postgresql://...paste the URI..."
   npm run db:migrate
   npm run create-admin -- admin "ChooseAStrongPassword" "Your Name"
   ```
   `db:migrate` creates every table and loads the 30 niyams (placeholder 10 points each) – safe to re-run.
4. **Photos:** Storage → *New bucket* → name `photos` → keep it **Private** (these are children’s photos).
5. Project Settings → API → copy the **Project URL** (`SUPABASE_URL`) and the **service_role** key
   (`SUPABASE_SERVICE_KEY`). Never put the service key in any file that is committed or sent to a browser.

### b) Vercel (hosting)
1. Push this folder to a private GitHub repository and import it at <https://vercel.com/new>.
2. Add these Environment Variables (see `.env.example`): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
   `SUPABASE_BUCKET=photos`, and `SESSION_SECRET` (a long random string – generate one with the command in `.env.example`).
3. Deploy. Your app is at `https://<project>.vercel.app` – add your own domain under Project → Domains if you like.

### c) Install on phones
- **Android / Chrome:** open the site → menu → *Install app* (the Profile page also shows an Install button).
- **iPhone / Safari:** Share → *Add to Home Screen* (Profile page shows these steps).

---

## 3. How it works

**Students**
- Register once (photo, DOB, village, parents, residence, Sangh, dharmik abhyas, pathshala). At least one parent’s
  name + number is required. Login = any of the three phone numbers + a 4-digit PIN they set at registration. They stay
  logged in on that phone until they tap *Log out*.
- If two siblings share a phone **and** pick the same PIN, login shows a “who is logging in?” picker.
- Forgot PIN → admin opens the student, taps **Reset PIN**, tells the family the temporary PIN; the student must then
  choose a new one. (All their devices are signed out when this happens.)
- **Today** screen: tap a niyam to turn it green. #12 is a one-of-four choice (Biyasana 30 / Ekasana 40 / Ayambil 50 /
  Upvas 60), #6 is a gatha counter (× 20 points). Day total and month total update instantly; saving happens in the
  background and works offline (changes sync when the phone is back online).
- **Submit & lock:** a student can change today and the previous N−1 days (N = *Edit window* in Settings, default 3) until they tap
  **Submit day** and confirm. A submitted day is **locked**: only an admin unlock can reopen it. Everyone has a unique
  **Student ID** like `26-00001` (joining year + running number), shown on the Today and Profile screens so they can quote it to the admin.
- **Rankings are admin-only.** Students see only their own points. Once a month has ended, the admin shares the result
  (see below) and students open the link to see the top 3, their own points and rank, and a button for their certificate.
- **Referral:** Profile → Invite friends. Shares a link like `/register?ref=ABC123` (WhatsApp / share sheet / copy).
  The new student sees “Invited by ‹name›”. Once the new student has logged on 3 different days, **both** get 100
  bonus points (amount and days are admin settings).
- **Gamification:** day streak 🪔 with milestone bonuses (7/21/51/108 days → 50/100/200/500 points by default),
  9 badges (tap a badge to open it and share it on WhatsApp), and a shareable **monthly certificate** (PNG) once a month has ended.
- **Printable sheet:** Profile → *Printable niyam sheet*: pick a month and a period (full month, days 1–15, day 16–end) and
  download a one-page A4 landscape **PDF** or **Excel** file with the niyam list, day columns, total row and signature lines.

**Admin (`/admin`)**
- **Dashboard:** students, active today / this month, points, referrals, daily-activity chart, registrations per month,
  niyam popularity, top Sanghs.
- **Students:** filter by **month range**, **min/max points in that range** (e.g. Dec 2026 – Mar 2027, ≥ 2000), Sangh,
  residence, village, age, pathshala, status, name/phone/code search; sort any column; **Export CSV**.
  Student page: all details, month-by-month totals, last 30 days, badges, referrals, **Reset PIN**,
  add/remove bonus points, deactivate.
- **Niyams:** edit Gujarati/English text, points, option points, order, active/inactive, add new niyams.
  Edit as many as you like and press **Save all changes** once – one button floats at the bottom-right of the screen while you scroll,
  and another sits at the end of the page. The page does not jump, and nothing is saved if any value is invalid.
  Points are stored with each entry, so changing points affects **new** entries only – tick *Also re-score past entries*
  (above the bottom Save button) to re-score what students already logged for the niyams whose points you changed
  (do this once when you replace the placeholder 10 points).
- **Donors:** sponsor for a month (name, optional photo, Gujarati/English message) – shown on every student’s home,
  at the top of the leaderboard and on certificates.
- **Unlock edits** (for boarding / hostel students and corrections): search by **Student ID** (or name / phone), choose how many past
  days to unlock (default 15, today counts as day 1) and for how many hours (default 24), add a note, and the student can change those
  days — even submitted ones — until the time is up. Active unlocks are listed and can be locked again at any time. Defaults are in Settings.
- **Leaderboard** (admin-only rankings): for a finished month, *Share on WhatsApp* sends a picture of the top 3 (photos + names) with a
  message and a link to `/results/YYYY-MM`; *Download picture* and *Copy message* are there for desktops.
- **Settings** (edit window, referral bonus/unlock days, streak bonuses), **Admins** (add teachers,
  change password).

**Privacy & safety**
- Students’ photos are in a private bucket and only shown to logged-in students and admins (never public URLs).
- PINs and admin passwords are stored hashed. 5 wrong PIN attempts lock that phone number for 15 minutes.
- All database access happens on the server; browsers never talk to the database directly.

---

## 4. Project map

| Path | What |
| --- | --- |
| `src/app/(student)/` | Today, Leaderboard, Progress, Profile, Certificate |
| `src/app/login`, `register`, `change-pin` | Auth screens |
| `src/app/admin/` | Admin panel (`actions.ts` = all admin writes) |
| `src/app/api/` | Auth, logs (autosave), profile, photo, referral lookup |
| `src/lib/logs.ts` | Saving a niyam + streak / referral / badge rules |
| `src/lib/admin-data.ts` | Dashboard + student filter SQL |
| `src/i18n/` | English + Gujarati text |
| `supabase/migrations`, `supabase/seed.sql` | Database schema and the 30 niyams |
| `public/sw.js` | Service worker (offline page + asset caching) |

---

## 5. Boarding / hostel students

Students who have no phone on weekdays fill a printed sheet at the hostel and send it home every 10–15 days:
1. Parents print the sheet from the app (Profile → *Printable niyam sheet*), or you print it from the same page.
2. When the filled sheet comes back, the parents call you with the child's **Student ID**.
3. In the admin panel open **Unlock edits**, search the ID, and unlock the last 15 days for 24 hours (change the numbers if needed).
4. The parents log in with the child's number and PIN, open each day from the day chips and tick the niyams, then tap **Submit day** on each.

## 6. Updating an existing deployment

Version 2 adds database tables and the Student ID column. **Run the migration before the new code goes live:**

```powershell
npm run db:migrate
```

It is safe to run repeatedly. Existing students are numbered in the order they joined (e.g. `26-00001`).
