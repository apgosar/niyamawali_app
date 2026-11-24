-- Donors are no longer tied to a month: the admin adds and removes them whenever needed,
-- and the most recently added one is shown to students. Safe to run more than once.
alter table donors add column if not exists id serial;
alter table donors add column if not exists created_at timestamptz not null default now();

-- the month stops being the key (must happen before it can become optional)
alter table donors drop constraint if exists donors_pkey;
alter table donors alter column month drop not null;
alter table donors add constraint donors_pkey primary key (id);

-- existing monthly donors keep their order: the latest month counts as the newest
update donors set created_at = (month || '-01')::timestamptz where month is not null;
