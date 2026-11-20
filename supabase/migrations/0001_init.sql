-- Niyamawali – Divine Sanskar Shibir
-- Plain PostgreSQL (works on Supabase and on the local PGlite dev database).
-- All access happens server-side; browsers never talk to the database directly.

create table if not exists students (
  id             uuid primary key default gen_random_uuid(),
  first_name     text not null check (first_name !~ '\s' and length(first_name) > 0),
  surname        text not null,
  photo_key      text not null,
  dob            date not null,
  village        text not null,
  father_name    text,
  father_phone   text,
  mother_name    text,
  mother_phone   text,
  own_phone      text,
  residence      text not null,
  sangh          text not null,
  dharmik_abhyas text not null,
  pathshala      boolean not null,
  pathshala_name text,
  pin_hash       text not null,
  must_change_pin boolean not null default false,
  session_version int not null default 1,
  referral_code  text not null unique,
  referred_by    uuid references students(id) on delete set null,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  -- at least one parent (name AND phone) is mandatory
  constraint one_parent_required check (
    (coalesce(father_name,'') <> '' and coalesce(father_phone,'') <> '')
    or (coalesce(mother_name,'') <> '' and coalesce(mother_phone,'') <> '')
  ),
  constraint pathshala_which check (not pathshala or coalesce(pathshala_name,'') <> '')
);
create index if not exists students_father_phone_idx on students(father_phone);
create index if not exists students_mother_phone_idx on students(mother_phone);
create index if not exists students_own_phone_idx on students(own_phone);
create index if not exists students_sangh_idx on students(sangh);

create table if not exists niyams (
  id             serial primary key,
  sort_order     int not null,
  name_gu        text not null,
  name_en        text not null,
  type           text not null check (type in ('boolean','choice','count')),
  points         int not null default 10,          -- boolean niyams
  points_per_unit int not null default 0,          -- count niyams
  max_count      int not null default 20,          -- count niyams
  active         boolean not null default true
);

create table if not exists niyam_options (
  id         serial primary key,
  niyam_id   int not null references niyams(id) on delete cascade,
  code       text,                                  -- biyasana / ekasana / ayambil / upvas
  label_gu   text not null,
  label_en   text not null,
  points     int not null,
  sort_order int not null default 0,
  active     boolean not null default true
);

create table if not exists daily_logs (
  student_id uuid not null references students(id) on delete cascade,
  log_date   date not null,
  niyam_id   int  not null references niyams(id) on delete cascade,
  value      int  not null,                         -- 1 | option id | count
  points     int  not null,                         -- snapshot at save time
  updated_at timestamptz not null default now(),
  primary key (student_id, log_date, niyam_id)
);
create index if not exists daily_logs_date_idx on daily_logs(log_date);

create table if not exists bonus_points (
  id         bigserial primary key,
  student_id uuid not null references students(id) on delete cascade,
  awarded_on date not null,
  kind       text not null check (kind in ('referral','streak','manual')),
  ref        text,                                  -- makes automatic awards idempotent
  points     int not null,
  note       text,
  created_at timestamptz not null default now()
);
create unique index if not exists bonus_unique_ref on bonus_points(student_id, kind, ref) where ref is not null;
create index if not exists bonus_date_idx on bonus_points(awarded_on);

create table if not exists referrals (
  referee_id  uuid primary key references students(id) on delete cascade,
  referrer_id uuid not null references students(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','awarded')),
  awarded_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on referrals(referrer_id);

create table if not exists student_badges (
  student_id uuid not null references students(id) on delete cascade,
  badge_code text not null,
  earned_on  date not null,
  primary key (student_id, badge_code)
);

create table if not exists donors (
  month      text primary key check (month ~ '^\d{4}-\d{2}$'),
  name       text not null,
  photo_key  text,
  message_gu text,
  message_en text
);

create table if not exists admins (
  id            serial primary key,
  username      text not null unique,
  name          text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists settings (
  key   text primary key,
  value text not null
);

create table if not exists login_attempts (
  id       bigserial primary key,
  phone    text not null,
  at       timestamptz not null default now()
);
create index if not exists login_attempts_phone_idx on login_attempts(phone, at);
