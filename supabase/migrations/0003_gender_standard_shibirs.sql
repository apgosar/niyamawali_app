-- 0003: gender (M / F), current standard (1-15) and previously attended Divine Sanskar Shibirs.
-- Idempotent: safe to run more than once. Existing students keep these empty until they fill them in.

alter table students add column if not exists gender text;
alter table students add column if not exists standard int;
-- comma-separated codes, e.g. 'jogeshwari,deolali' (empty = none)
alter table students add column if not exists previous_shibirs text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'students_gender_check') then
    alter table students add constraint students_gender_check check (gender in ('M', 'F'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'students_standard_check') then
    alter table students add constraint students_standard_check check (standard between 1 and 15);
  end if;
end $$;
