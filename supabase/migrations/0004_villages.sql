-- 0004: the village list used by the registration form (searchable dropdown).
-- Students can type a village that is not on the list; it is then added here for everyone.
-- Idempotent: safe to run more than once.

create table if not exists villages (
  id         serial primary key,
  name       text not null check (length(btrim(name)) >= 2),
  source     text not null default 'student' check (source in ('list', 'student')),
  created_at timestamptz not null default now()
);
-- one spelling per village, whatever the capitalisation
create unique index if not exists villages_name_lower_idx on villages (lower(name));

-- the official list
insert into villages (name, source)
select v.name, 'list'
  from (values
  ('Bada'),
  ('Bagda'),
  ('Bambhdai'),
  ('Baroi'),
  ('Bayath'),
  ('Beraja'),
  ('Bharapur'),
  ('Bhisara'),
  ('Bhojay'),
  ('Bhorara'),
  ('Bhuj'),
  ('Bhujpur'),
  ('Bidada'),
  ('Changdai'),
  ('Chhasara'),
  ('Chiyasar'),
  ('Chundi'),
  ('Dedhia'),
  ('Depa'),
  ('Deshalpur'),
  ('Deshalpur Kanthi'),
  ('Devpur'),
  ('Doan'),
  ('Dumra'),
  ('Faradi'),
  ('Gadhsisa'),
  ('Gajod'),
  ('Gelda'),
  ('Godhra'),
  ('Gundala'),
  ('Halapur'),
  ('Hamlamanjal'),
  ('Kandagara'),
  ('Kapaya'),
  ('Karaghogha'),
  ('Kharua'),
  ('Koday'),
  ('Kokalia'),
  ('Kotda Roha'),
  ('Kotdi Mahadevpuri'),
  ('Kundrodi'),
  ('Lakhapur'),
  ('Lathedi'),
  ('Layja'),
  ('Luni'),
  ('Makda'),
  ('Mandvi'),
  ('Manjal Reladia'),
  ('Mapar'),
  ('Merau'),
  ('Mokha'),
  ('Mothara'),
  ('Moti Khakhar'),
  ('Moti Varandi'),
  ('Mundra'),
  ('Nagalpur'),
  ('Nagrecha'),
  ('Nana Asambia'),
  ('Mota Asambia'),
  ('Nana Bhadia'),
  ('Nana Ratadia'),
  ('Mota Ratadia'),
  ('Nani Khakhar'),
  ('Naranpur'),
  ('Naredi'),
  ('Navavas / Durgapur'),
  ('Navinar'),
  ('Patri'),
  ('Pragpur'),
  ('Pratapur'),
  ('Pundi'),
  ('Rajda'),
  ('Ramania'),
  ('Ratadia Ganeshwala'),
  ('Rayan'),
  ('Raydhanjar'),
  ('Sabhrai'),
  ('Sadau'),
  ('Samaghogha'),
  ('Sanosara'),
  ('Sherdi'),
  ('Talwana'),
  ('Thoriyari'),
  ('Toda'),
  ('Tragdi'),
  ('Tumbdi'),
  ('Tunda'),
  ('Undoth'),
  ('Vaandh'),
  ('Vadala'),
  ('Vanki'),
  ('Varandi Moti'),
  ('Vidh'),
  ('Vinjan')
  ) as v(name)
on conflict do nothing;

-- villages that earlier students already typed in
insert into villages (name, source)
select distinct on (lower(btrim(village))) btrim(village), 'student'
  from students
 where length(btrim(village)) >= 2
 order by lower(btrim(village)), created_at
on conflict do nothing;
