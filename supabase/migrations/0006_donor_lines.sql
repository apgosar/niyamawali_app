-- Donor name is shown on up to three lines, in English (`name`) and Gujarati (`name_gu`):
-- the lines are stored separated by line breaks. Safe to run more than once.
alter table donors add column if not exists name_gu text;
