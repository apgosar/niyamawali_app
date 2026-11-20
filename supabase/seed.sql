-- Seed data: the 30 niyams from the printed "ગુજરાતી નિયમાવલી" sheet.
-- Every Yes/No niyam starts with a PLACEHOLDER of 10 points – set the real values in Admin > Niyams.
-- Safe to run more than once: it only inserts when the tables are empty.

insert into niyams (sort_order, name_gu, name_en, type, points, points_per_unit, max_count)
select * from (values
  (1,  'સવારે ઊઠીને આઠ અને સૂતા સાત નવકાર ગણવા', 'Recite 8 Navkar after waking up and 7 before sleeping', 'boolean', 10, 0, 0),
  (2,  'વડીલોના ચરણ સ્પર્શ કરવા', 'Touch the feet of elders', 'boolean', 10, 0, 0),
  (3,  'ચા/કૉફી/કોકો/બોર્નવિટા ત્યાગ', 'Give up tea / coffee / cocoa / Bournvita', 'boolean', 10, 0, 0),
  (4,  'નહાવામાં અડધી ડોલથી વધારે પાણી વાપરવું નહીં', 'Use no more than half a bucket of water to bathe', 'boolean', 10, 0, 0),
  (5,  'પાઠશાળા જવું', 'Go to Pathshala', 'boolean', 10, 0, 0),
  (6,  'નવી ગાથા અર્થ સાથે કરવી (૧ ગાથા = ૨૦ points)', 'Learn a new gatha with its meaning (1 gatha = 20 points)', 'count', 0, 20, 10),
  (7,  'ગુરુ મહારાજનું વ્યાખ્યાન સાંભળવું', 'Listen to the Guru Maharaj''s vyakhyan', 'boolean', 10, 0, 0),
  (8,  'પરમાત્માની પૂજા કરવી તથા ચૈત્યવંદન કરવું', 'Do puja of Paramatma and Chaityavandan', 'boolean', 10, 0, 0),
  (9,  'ગુરુ વંદન (ગુરુ ભગવંત ન હોય તો ફોટો ચાલશે)', 'Guru vandan (a photo is fine if the Guru Bhagwant is not present)', 'boolean', 10, 0, 0),
  (10, 'જૂઠું બોલવું નહીં', 'Do not lie', 'boolean', 10, 0, 0),
  (11, 'એક રોટલી લુખી વાપરવી', 'Eat one plain (dry) roti', 'boolean', 10, 0, 0),
  (12, 'બિયાસણા / એકાસણા / આયંબિલ / ઉપવાસ કરવું', 'Biyasana / Ekasana / Ayambil / Upvas', 'choice', 0, 0, 0),
  (13, 'એઠા મોઢે બોલવું નહીં અને એઠું મૂકવું નહીં', 'Do not speak with food in the mouth and do not leave food on the plate', 'boolean', 10, 0, 0),
  (14, 'ઉકાળેલું પાણી પીવું', 'Drink boiled water', 'boolean', 10, 0, 0),
  (15, 'એક સામાયિક કરવું', 'Do one Samayik', 'boolean', 10, 0, 0),
  (16, 'ભોજન કરતી વખતે TV/મોબાઈલ નો ત્યાગ', 'No TV / mobile while eating', 'boolean', 10, 0, 0),
  (17, 'અપશબ્દ અને ગાળ ત્યાગ', 'Give up abusive words and swearing', 'boolean', 10, 0, 0),
  (18, 'વડીલોની સામે બોલવું નહીં', 'Do not talk back to elders', 'boolean', 10, 0, 0),
  (19, 'મૂવી, સિરિયલ, વેબસિરીઝ ત્યાગ', 'Give up movies, serials and web series', 'boolean', 10, 0, 0),
  (20, 'બ્રેડ, પાંઉ, ચીઝ, બટર ત્યાગ', 'Give up bread, pav, cheese and butter', 'boolean', 10, 0, 0),
  (21, 'Ice cream & cold drinks નો ત્યાગ', 'Give up ice cream and cold drinks', 'boolean', 10, 0, 0),
  (22, 'કંદમૂળ - વાસીભોજન નો ત્યાગ', 'Give up root vegetables and stale food', 'boolean', 10, 0, 0),
  (23, 'હોટેલ - ફાસ્ટફૂડ (બહાર નું ફૂડ) ત્યાગ', 'Give up hotel / fast food (outside food)', 'boolean', 10, 0, 0),
  (24, 'જ્ઞાનના પાંચ ખમાસમણા', 'Five khamasamana of Gyan', 'boolean', 10, 0, 0),
  (25, 'ૐ હ્રીં નમો નાણસ્સની - ૧ માળા ગણવી', 'Chant 1 mala of "Om Hrim Namo Nanassa"', 'boolean', 10, 0, 0),
  (26, 'પંદર મિનિટ મૌન', 'Keep silence for fifteen minutes', 'boolean', 10, 0, 0),
  (27, 'રાત્રિભોજન ત્યાગ (ચોવિહાર/તિવિહાર)', 'No night eating (Chovihar / Tivihar)', 'boolean', 10, 0, 0),
  (28, 'પરમાત્માની આરતી કરવી', 'Perform aarti of Paramatma', 'boolean', 10, 0, 0),
  (29, '૧૫ મિનિટ પરિવાર સાથે બેસીને ધર્મ ચર્ચા કરવી', 'Sit with the family for 15 minutes of dharmik discussion', 'boolean', 10, 0, 0),
  (30, 'રાત્રે ૧૦:૩૦ પછી મોબાઇલ, ટીવી, લેપટોપ નો ત્યાગ', 'No mobile, TV or laptop after 10:30 pm', 'boolean', 10, 0, 0)
) as v(sort_order, name_gu, name_en, type, points, points_per_unit, max_count)
where not exists (select 1 from niyams);

insert into niyam_options (niyam_id, code, label_gu, label_en, points, sort_order)
select n.id, o.code, o.label_gu, o.label_en, o.points, o.sort_order
from niyams n,
  (values
    ('biyasana', 'બિયાસણા', 'Biyasana', 30, 1),
    ('ekasana',  'એકાસણા', 'Ekasana',  40, 2),
    ('ayambil',  'આયંબિલ', 'Ayambil',  50, 3),
    ('upvas',    'ઉપવાસ',  'Upvas',    60, 4)
  ) as o(code, label_gu, label_en, points, sort_order)
where n.sort_order = 12
  and not exists (select 1 from niyam_options);

insert into settings (key, value) values
  ('edit_window_days',    '3'),
  ('referral_bonus',      '100'),
  ('referral_unlock_days','3'),
  ('streak_bonuses',      '7:50,21:100,51:200,108:500')
on conflict (key) do nothing;
