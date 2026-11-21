-- 0002: unique Student IDs, day submissions (edit lock) and admin edit unlocks.
-- Idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- Student ID, e.g. 26-00001  (joining year in India + running number)
-- ---------------------------------------------------------------------------
create sequence if not exists student_no_seq;
alter table students add column if not exists student_code text;

do $$
begin
  if exists (select 1 from students where student_code is null) then
    -- number existing students in the order they joined
    update students s
       set student_code = to_char(s.created_at at time zone 'Asia/Kolkata', 'YY') || '-' || lpad((o.rn + o.base)::text, 5, '0')
      from (select id,
                   row_number() over (order by created_at, id) as rn,
                   (select count(*) from students where student_code is not null) as base
              from students where student_code is null) o
     where s.id = o.id;
    perform setval('student_no_seq', (select count(*) from students));
  end if;
end $$;

alter table students alter column student_code set default
  (to_char(now() at time zone 'Asia/Kolkata', 'YY') || '-' || lpad(nextval('student_no_seq')::text, 5, '0'));
alter table students alter column student_code set not null;
create unique index if not exists students_student_code_idx on students(student_code);

-- ---------------------------------------------------------------------------
-- A student "submits" a day; a submitted day is locked until an admin unlocks it.
-- ---------------------------------------------------------------------------
create table if not exists daily_submissions (
  student_id   uuid not null references students(id) on delete cascade,
  log_date     date not null,
  submitted_at timestamptz not null default now(),
  primary key (student_id, log_date)
);

-- ---------------------------------------------------------------------------
-- Admin unlock: for a limited time the student may edit the last N days
-- (including days that were already submitted).
-- ---------------------------------------------------------------------------
create table if not exists edit_grants (
  id         bigserial primary key,
  student_id uuid not null references students(id) on delete cascade,
  days_back  int  not null check (days_back between 1 and 62),
  expires_at timestamptz not null,
  granted_by int references admins(id) on delete set null,
  note       text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists edit_grants_student_idx on edit_grants(student_id, expires_at);
