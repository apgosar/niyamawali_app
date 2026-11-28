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
  Upvas 60), #6 is a gatha counter (× 20 points), #31 is Rai / Devsi Pratikraman (tick one or both, 50 points each). Day total and month total update instantly; saving happens in the
  background and works offline (changes sync when the phone is back online).
- **Submit & lock:** a student can change today and the previous N−1 days (N = *Edit window* in Settings, default 3) until they tap
  **Submit day** and confirm. A submitted day is **locked**: only an admin unlock can reopen it. Everyone has a unique
  **Student ID** like `26-M-00001` (joining year + gender M/F + running number; students who registered before gender was asked keep the older form `26-00001`), shown on the Today and Profile screens so they can quote it to the admin.
- **Rankings are admin-only.** Students see only their own points. Once a month has ended, the admin sends out the results link
  (see below) and students open it to see their own points and a button for their certificate. No names or ranks are shown.
- **Referral** (can be switched **on / off** under Admin → Settings → *Referral programme*; it is OFF by default): Profile → Invite friends. Shares a link like `/register?ref=ABC123` (WhatsApp / share sheet / copy).
  The new student sees “Invited by ‹name›”. Once the new student has logged on 3 different days, **both** get 100
  bonus points (amount and days are admin settings).
- **Gamification:** day streak 🪔 with milestone bonuses (7/21/54/108 days → 50/100/200/500 points by default),
  10 badges on the **Progress** tab (tap a badge to open it and share it on WhatsApp), and a shareable **monthly certificate** (PNG) once a month has ended.
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
- **Donors:** sponsor (name, optional photo, Gujarati/English message) – shown on every student’s home,
  on the opening screen and on certificates.
- **Unlock edits** (for boarding / hostel students and corrections): search by **Student ID** (or name / phone), choose how many past
  days to unlock (default 15, today counts as day 1) and for how many hours (default 24), add a note, and the student can change those
  days — even submitted ones — until the time is up. Active unlocks are listed and can be locked again at any time. Defaults are in Settings.
- **Leaderboard** (admin-only rankings; only students who attended a previous Shibir are ranked): for a finished month, *Download picture*
  saves the top 3 picture for your own use, and *Copy message* copies a message with the students’ results link `/results/YYYY-MM`.
- **Settings** (referral programme on/off, edit window, referral bonus/unlock days, streak bonuses), **Admins** (add teachers,
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
| `supabase/migrations`, `supabase/seed.sql` | Database schema and the 31 niyams |
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

## 7. Opening screen, new registration fields, daily entries

- **Opening screen:** when the app is opened, the Shibir logo and the current donor (name, photo, message from *Admin → Donors*) are shown
  until the student taps to continue, once per app launch. Admin pages never show it. Donor photos are public so they can appear before
  login; student photos stay private.
- **Registration** also asks for **gender** (M/F, part of the Student ID and fixed once set), **current standard** (1st – 15th) and a
  multi-select dropdown **Previous Divine Sanskar Shibir attended** (Jogeshwari, Deolali, Kutch - Don, Kutch - Pundi). Students who have no
  saved answer can fill these in under Profile → *My details*. The admin sees them on the student page and in the CSV export.
- **Admin → Daily entries** shows every student for one date (who entered, how many niyams, points, whether the day was submitted and when).
  Open a student (or use *Daily entries* on a student page) for a month grid like the paper sheet — ✓, gatha counts and choice letters per
  day, with 🔒 for submitted days — plus a day-by-day list with exact values and the time each entry was last changed. CSV export for both.

Version 3 adds three columns (gender, standard, previous shibirs): run `npm run db:migrate` before deploying (safe to repeat).
## 8. Turning referrals off and on

Admin → **Settings** → slide **Referral programme** on or off → *Save settings*. It starts **off**. While it is off, the referral bonus and
unlock-days fields are greyed out (their saved values are kept).

- **Off:** students do not see the *Invite friends* card or the “Kalyan Mitra” badge, badge share messages carry no bonus promise or invite code,
  old `?ref=` links just open the normal registration form (nobody is linked as a referrer), and no referral bonus is paid.
- Referrals already made are kept and bonuses already paid stay. Referrals still waiting for their logged days are **paused** and are paid
  when the student next submits a day after you turn it back **on**.

## 9. Village list

The **Village** field on registration and *Edit profile* is a search box: type a few letters and the matching villages from the list appear
straight away. Tap one to use it. If the village is not on the list, whatever was typed is accepted (tidied up: single spaces, capital letters)
and **added to the list** for the next student. Capitals and spacing never create duplicates (“bhuj”, “BHUJ” and “Bhuj” are one village).

The list is the `villages` table. It starts with the 94 villages supplied (`supabase/migrations/0004_villages.sql`) plus any village existing
students have already entered. Run `npm run db:migrate` before deploying (safe to repeat).

## 10. Niyam vs bonus points

Admin → a student → **Month by month** shows Days, **Niyam** points, **Bonus** points and Total for each month (with an all-time row). Students see the same split on
their Progress page whenever the month has bonus points.

## 11. Rules tab

Students have a **Rules** tab (📜) in the bottom bar with the Divine Sanskar Shibir Niyamawali rules and guidelines in English and Gujarati. The text lives in
`src/i18n/rules.ts` – change a rule there in both languages.

## 12. Streaks and badges

- **A day counts only once it is submitted.** Ticking or unticking niyams changes points, but not the streak or badges.
- A streak counts submitted days in a row. It **stays alive while the missing days can still be submitted** (the edit window, or days an
  admin has unlocked). The Today screen then shows *“Submit Tue 24 Nov to continue your 5-day streak”*; tapping it opens that day.
  Once a missing day can no longer be submitted, the streak is 0.
- Badges and streak bonus points are worked out when a day is submitted (and again if an admin-unlocked submitted day is changed). Streak,
  first-day, Tapasvi and Gyani badges, and streak bonuses, are taken back if submitted days do not support them.
- Older days that were never submitted do not count. An admin can unlock them so the student can submit them.
- Every “day” is a day in **India (IST)**, whatever timezone the server uses. An app left open overnight reloads itself on the new day.

## 13. Donor (Labharthi Parivaar)

Admin → **Donors**: type the name on up to **three lines** in English and in Gujarati (e.g. family name, *Haste- …*, *Gaam- …*) and choose the
**family photo**. A wide or square photo works best; large photos are shrunk in the browser before upload.

- **Opening screen:** the photo is shown large (if it is taller than the space, the **top** is cut off), with *Labharthi Parivaar:* and the lines.
- **Niyam screen:** a small round picture and the lines; tapping it opens the whole photo with the full name.
- The newest donor is the one shown; remove it to stop showing it. Run `npm run db:migrate` before deploying (safe to repeat).

## 14. Rai / Devsi Pratikraman, Sutra and Gatha number, ranking

- **Multiple-choice niyam:** *Rai / Devsi Pratikraman* gives 50 points for each one ticked (100 for both). Change names and points under
  Admin → Niyams. It is added by `supabase/seed.sql` with the next free number.
- **Gatha niyam:** once at least one gatha is counted, two optional boxes appear (*Sutra name*, *Gatha no.*), one pair per day. The admin sees
  them on the student’s daily entries page and in its CSV export.
- **Previous Shibir** is now required at registration; *None of the above* is one of the answers. Once saved, the answer **cannot be
  changed** by the student (*My details* shows it read-only), because it decides who is ranked. A student with no saved answer gives it once
  on *My details*.
- **Admin → a student → *✎ Edit profile*** changes any profile detail: photo, names, date of birth, gender, village, parents and phone
  numbers, residence, Sangh, standard, dharmik abhyas, Pathshala and previous Shibirs. Changing the gender changes the M / F in the Student ID
  (the number stays). Changing the Shibir answer to *None of the above* removes the student's Top 10 badge. Login numbers are the ones saved
  here; use *Reset PIN* for the PIN.
- **Ranking** (admin leaderboard, its CSV, the top 3 picture and the Top 10 badge) leaves out students who answered *None of the above* or
  have not answered.
- A **54-day streak** badge was added, and the default streak bonus that was at 51 days is now at 54.
- Run `npm run db:migrate` before deploying (safe to repeat).

## 15. Sangh list

The **Sangh** field on registration and *Edit profile* is a search box like the Village field. It starts with the 103 Sanghs of the
*Consolidated Directory of Jain Sanghs* (`supabase/migrations/0007_sanghs.sql`). Search ignores capitals, copes with spellings such as
“achalgach” / “Achhalgachha”, and finds words in any order (“dahisar sangh”). A Sangh that is not listed is accepted and **added to the list**.
Run `npm run db:migrate` before deploying (safe to repeat).

