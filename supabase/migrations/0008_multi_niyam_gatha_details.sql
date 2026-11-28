-- 0008: multiple-choice niyams (tick one or more options), optional Sutra / Gatha number on gatha entries,
-- and the streak bonus moved from 51 to 54 days to match the new 54-day badge.
-- Idempotent: safe to run more than once. The Rai / Devsi Pratikraman niyam itself is added by seed.sql.

alter table niyams drop constraint if exists niyams_type_check;
alter table niyams add constraint niyams_type_check check (type in ('boolean', 'choice', 'count', 'multi'));

-- optional details a student may add to a gatha (count) entry
alter table daily_logs add column if not exists sutra text;
alter table daily_logs add column if not exists gatha_no text;

-- only the old default is changed; bonuses an admin has edited are left alone
update settings set value = '7:50,21:100,54:200,108:500'
 where key = 'streak_bonuses' and value = '7:50,21:100,51:200,108:500';
