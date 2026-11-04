-- ════════════════════════════════════════════════════════════════════
--  Fresh Start Grooming Lounge — Supabase backend schema
--  Project: https://nhvokxemyaymmqruzpcp.supabase.co
--
--  HOW TO INSTALL (one time, ~2 minutes):
--    1. Open your Supabase dashboard → SQL Editor → New query
--    2. Paste this ENTIRE file and click "Run"
--    3. Authentication → Users → "Add user" → create your admin
--       email + password (tick "Auto Confirm User")
--    4. Open /admin on the website, sign in with that account and
--       click "Claim admin access" (first account only).
--
--  Safe to re-run: every statement is idempotent.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1 · ADMIN ALLOW-LIST
-- ─────────────────────────────────────────────
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- Security-definer helpers avoid RLS recursion on admin_users.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.admin_exists()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users);
$$;

revoke execute on function public.is_admin() from anon;
revoke execute on function public.admin_exists() from anon;

-- ─────────────────────────────────────────────
-- 2 · CONTENT TABLES
-- ─────────────────────────────────────────────
create table if not exists public.services (
  id          text primary key,
  category    text not null default 'signature',
  name        text not null,
  description text not null default '',
  price       integer not null default 0 check (price >= 0),
  mins        integer not null default 30 check (mins > 0),
  tags        text not null default '',
  badge       text,
  vip         boolean not null default false,
  days        integer[],
  active      boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.barbers (
  id          text primary key,
  name        text not null,
  role        text not null default 'Barber',
  img         text,
  initials    text not null default '',
  specialties text[] not null default '{}',
  note        text not null default '',
  active      boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  detail       text not null default '',
  category     text not null default 'cuts',
  src          text not null,
  storage_path text,
  service_id   text references public.services (id) on delete set null,
  active       boolean not null default true,
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.ads (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',
  placement  text not null default 'ticker' check (placement in ('ticker', 'banner')),
  link_url   text,
  service_id text references public.services (id) on delete set null,
  active     boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  area       text not null default '',
  initials   text not null default '',
  hue        text not null default '#c9a24d',
  stars      integer not null default 5 check (stars between 1 and 5),
  when_label text not null default '',
  service    text not null default '',
  body       text not null default '',
  active     boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 120),
  phone        text not null check (char_length(phone) between 7 and 30),
  barber_id    text,
  barber_name  text,
  visit_type   text,
  guest_status text,
  visit_date   date,
  visit_time   text,
  services     jsonb not null default '[]',
  total_price  integer not null default 0,
  total_mins   integer not null default 0,
  notes        text not null default '',
  status       text not null default 'new' check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  created_at   timestamptz not null default now()
);

create index if not exists bookings_created_idx on public.bookings (created_at desc);
create index if not exists ads_placement_idx on public.ads (placement, active);

-- ─────────────────────────────────────────────
-- 3 · updated_at TRIGGERS
-- ─────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['services', 'barbers', 'gallery_images', 'ads', 'reviews'] loop
    execute format('drop trigger if exists touch_%I on public.%I', t, t);
    execute format(
      'create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ─────────────────────────────────────────────
-- 4 · ROW LEVEL SECURITY
--     Public (anon) reads only ACTIVE content.
--     Only allow-listed admins can write.
--     Anyone may CREATE a booking request; only admins read them.
-- ─────────────────────────────────────────────
alter table public.admin_users    enable row level security;
alter table public.services       enable row level security;
alter table public.barbers        enable row level security;
alter table public.gallery_images enable row level security;
alter table public.ads            enable row level security;
alter table public.reviews        enable row level security;
alter table public.bookings       enable row level security;

-- admin_users: signed-in users can see membership; the very first
-- signed-in user may claim admin; afterwards only admins manage it.
drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users
  for select to authenticated using (true);

drop policy if exists admin_users_bootstrap on public.admin_users;
create policy admin_users_bootstrap on public.admin_users
  for insert to authenticated
  with check (user_id = auth.uid() and not public.admin_exists());

drop policy if exists admin_users_admin_insert on public.admin_users;
create policy admin_users_admin_insert on public.admin_users
  for insert to authenticated with check (public.is_admin());

drop policy if exists admin_users_admin_delete on public.admin_users;
create policy admin_users_admin_delete on public.admin_users
  for delete to authenticated using (public.is_admin());

-- Content tables: public reads active rows, admins read/write everything.
do $$
declare t text;
begin
  foreach t in array array['services', 'barbers', 'gallery_images', 'ads', 'reviews'] loop
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (active)', t || '_public_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', t || '_admin_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_admin_write', t);

    execute format('drop policy if exists %I on public.%I', t || '_admin_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_admin_delete', t);
  end loop;
end;
$$;

-- Bookings: visitors submit requests; only admins can read/manage them.
drop policy if exists bookings_public_insert on public.bookings;
create policy bookings_public_insert on public.bookings
  for insert to anon, authenticated with check (true);

drop policy if exists bookings_admin_read on public.bookings;
create policy bookings_admin_read on public.bookings
  for select to authenticated using (public.is_admin());

drop policy if exists bookings_admin_update on public.bookings;
create policy bookings_admin_update on public.bookings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists bookings_admin_delete on public.bookings;
create policy bookings_admin_delete on public.bookings
  for delete to authenticated using (public.is_admin());

-- ─────────────────────────────────────────────
-- 5 · STORAGE — public image bucket, admin-only writes
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

drop policy if exists site_images_public_read on storage.objects;
create policy site_images_public_read on storage.objects
  for select using (bucket_id = 'site-images');

drop policy if exists site_images_admin_insert on storage.objects;
create policy site_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-images' and public.is_admin());

drop policy if exists site_images_admin_update on storage.objects;
create policy site_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'site-images' and public.is_admin());

drop policy if exists site_images_admin_delete on storage.objects;
create policy site_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-images' and public.is_admin());


-- ════════════════════════════════════════════════════════════════════
--  Fresh Start Grooming Lounge — seed content
--  Generated from src/data.js so the backend matches the website.
--  Run AFTER schema.sql (or instead of re-running schema — safe to
--  re-run: existing rows are left untouched).
-- ════════════════════════════════════════════════════════════════════

-- Services (25)
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('gentleman', 'signature', 'Gentleman''s Cut (Normal Shave)', 'Classic gentleman haircut with clean razor perimeter shave.', 1000, 30, 'gentleman classic shave razor normal', null, false, null, 0)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('junior', 'signature', 'Young Gentleman''s Cut Under 10', 'Gentle, patient haircut crafted for junior gentlemen under 10 years.', 1000, 30, 'kids children junior boy under 10', null, false, null, 1)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('bespoke', 'signature', 'Bespoke Haircut', 'Precision tailored haircut, scalp wash, hot towel finish & custom styling.', 1500, 40, 'cut fade haircut wash style signature', null, false, null, 2)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('caucasian', 'signature', 'Caucasian Haircut', 'Specialized scissor-work, fine hair taper, texturing & refined styling.', 2500, 45, 'scissor cut fine hair taper texture caucasian', null, false, null, 3)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('grey', 'signature', 'Haircut + Grey Reduction/Dye', 'Precision cut with subtle natural grey blending or full dye coverage.', 2500, 60, 'grey dye colour color blend reduction', null, false, null, 4)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('student', 'signature', 'The Mbogi Experience — 3 Student Haircuts', 'Three student haircuts for the crew — Monday to Wednesday only. Student ID optional; bring the mbogi, we handle the fresh.', 2500, 90, 'student mbogi shave na mbogi group offer campus monday tuesday wednesday', 'Mon–Wed', false, array[1,2,3]::integer[], 5)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('group3', 'signature', '3-Person Haircut Package', 'Three haircuts in one relaxed 90-minute group session — brothers, friends or the whole crew.', 3000, 90, 'group three friends brothers package cut', null, false, null, 6)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('freefriend', 'signature', 'Bring 2 Friends — Free Classic Shave', 'Referral treat: two friends enjoy Bespoke Haircuts (KSh 1,500 each) and the guest who brings them receives a complimentary Classic Shave in the same 90-minute visit.', 3000, 90, 'referral offer free classic shave friends group promo', 'Referral', false, null, 7)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('hairline', 'grooming', 'Hairline Shape Up', 'Crisp razor contouring, temple line definition & neck cleanup.', 500, 20, 'line up shape hairline edge neck razor', null, false, null, 8)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('beard', 'grooming', 'Beard Trim', 'Detailed beard sculpture, edge line up, conditioning oil & soothing balm.', 500, 20, 'beard sculpt trim oil balm edge', null, false, null, 9)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('enhancement', 'grooming', 'Enhancement/Dye Without Shave', 'Semi-permanent hairline or beard fiber dye enhancement without a haircut.', 1000, 20, 'dye enhancement fiber beard hairline colour', null, false, null, 10)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('texture', 'colour', 'Texturing + Shave', 'Curl definition, wave texturing, or relaxing paired with signature shave.', 2500, 50, 'texture waves curls relax perm shave', null, false, null, 11)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('halfcolour', 'colour', 'Half Color + Shave', 'Creative partial tone dye or bleach artistry paired with a full shave.', 3500, 60, 'colour color bleach dye shave half', null, false, null, 12)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('fullcolour', 'colour', 'Full Color + Shave', 'Complete head color transformation paired with bespoke shave & finish.', 5000, 90, 'colour color dye bleach full shave transformation', null, false, null, 13)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('scrub', 'face', 'Face Scrub', 'Deep exfoliating scrub to unclog pores, remove dead cells & refresh skin.', 1000, 20, 'scrub exfoliate skin face pores', null, false, null, 14)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('halffacial', 'face', 'Half Facial', 'Targeted express cleansing, warm ozone steam & hydration mask.', 2000, 30, 'facial steam mask hydration express ozone', null, false, null, 15)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('fullfacial', 'face', 'Full Facial', 'Comprehensive facial ritual with deep extraction, botanical mask & moisturizer.', 3000, 45, 'facial extraction botanical mask moisturizer', null, false, null, 16)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('manicure', 'hands', 'Manicure', 'Gentle hand exfoliation, nail trimming, cuticle grooming & buffing.', 1000, 25, 'manicure hands nails cuticle buff', null, false, null, 17)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('pedicure', 'hands', 'Pedicure', 'Relaxing foot soak, scrub, callus treatment, nail shaping & cuticle care.', 2000, 40, 'pedicure feet nails callus soak', null, false, null, 18)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('halfmassage', 'body', 'Half Massage', 'Focused tension release for neck, shoulders, and upper back.', 2500, 30, 'massage neck shoulders back tension', null, false, null, 19)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('fullmassage', 'body', 'Full Body Massage', 'Full therapeutic relaxation massage with warm essential botanical oils.', 4000, 60, 'massage full body oils relaxation therapy', null, false, null, 20)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('vip1', 'vip', 'VIP Experience I: The Executive Grooming Ritual', 'Bespoke Shave + Pedicure + Manicure + Full Facial.', 7000, 90, 'vip executive shave pedicure manicure facial', null, true, null, 21)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('vip3', 'vip', 'VIP Experience III: The Renewal Ritual', 'Bespoke Shave + Manicure + Pedicure + Full Facial + Half Massage.', 10000, 120, 'vip renewal ritual facial massage shave', null, true, null, 22)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('vip2', 'vip', 'VIP Experience II: The Complete Gentleman', 'Bespoke Shave + Pedicure + Manicure + Full Facial + Full Body Massage.', 10500, 120, 'vip complete gentleman massage facial shave', null, true, null, 23)
on conflict (id) do nothing;
insert into public.services (id, category, name, description, price, mins, tags, badge, vip, days, sort)
values ('vip4', 'vip', 'VIP Experience IV: The Ultimate Fresh Start', 'Bespoke Shave + Pedicure + Manicure + Full Facial + Half Massage + Full Body Massage.', 13000, 150, 'vip ultimate fresh start massage facial shave', null, true, null, 24)
on conflict (id) do nothing;

-- Barbers (5)
insert into public.barbers (id, name, role, img, initials, specialties, note, sort)
values ('any', 'Any Available Barber', 'Next open chair', null, 'FS', array['Fastest seat','All services','Walk-in friendly']::text[], 'Let the lounge match you to the next available craftsman.', 0)
on conflict (id) do nothing;
insert into public.barbers (id, name, role, img, initials, specialties, note, sort)
values ('starkid', 'Starkid Bright', 'Senior Barber', '/img/barber-starkid.jpg', 'SB', array['Bespoke cuts','Line-ups','Beard sculpt']::text[], 'Sharp, architectural fades finished with a razor line-up.', 1)
on conflict (id) do nothing;
insert into public.barbers (id, name, role, img, initials, specialties, note, sort)
values ('cossy', 'Cossy Romeo', 'Grooming Specialist', '/img/barber-cossy.jpg', 'CR', array['Textured afro','Hot towel shave','Styling']::text[], 'Texture, movement and a shave that smells like the lounge.', 2)
on conflict (id) do nothing;
insert into public.barbers (id, name, role, img, initials, specialties, note, sort)
values ('alphie', 'Alphie The Barber', 'Razor & Shave Artisan', '/img/barber-alphie.jpg', 'AB', array['Straight razor','Clean shave','Skin fades']::text[], 'The straight razor is the instrument. Patience is the method.', 3)
on conflict (id) do nothing;
insert into public.barbers (id, name, role, img, initials, specialties, note, sort)
values ('mike', 'Mike will fade it', 'Fade Specialist', '/img/barber-mike.jpg', 'MF', array['Skin fades','Curl sponge','Kids cuts']::text[], 'If it can be blended, it can be faded. Bring a reference.', 4)
on conflict (id) do nothing;

-- Gallery (9) — seeded only when the table is empty
do $$ begin
  if not exists (select 1 from public.gallery_images) then
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('Precision Skin Fade & Line-Up', 'Clipper-blended fade · razor temple line · 40 min', 'cuts', '/img/fade.jpg', 'bespoke', 0);
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('The Hot-Towel Ritual', 'Straight razor · hot towel · VIP Collection finish', 'beard', '/img/vip.jpg', 'vip1', 1);
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('Beard Sculpture', 'Detailed sculpt · edge line-up · conditioning oil & balm', 'beard', '/img/beard.jpg', 'beard', 2);
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('Full Facial Ritual', 'Deep cleansing · warm ozone steam · botanical mask', 'face', '/img/facial.jpg', 'fullfacial', 3);
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('Full Body Massage', 'Therapeutic relaxation · warm botanical oils · 60 min', 'body', '/img/massage.jpg', 'fullmassage', 4);
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('Manicure & Hand Care', 'Exfoliation · cuticle grooming · buff at the marble counter', 'body', '/img/hands.jpg', 'manicure', 5);
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('The Bespoke Chair', 'Tailored cut · scalp wash · custom styling', 'cuts', '/img/hero.jpg', 'bespoke', 6);
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('Coffee, Always On Us', 'Coffee · tea · light bites with every service', 'lounge', '/img/lounge.jpg', null, 7);
    insert into public.gallery_images (title, detail, category, src, service_id, sort)
    values ('Starkid Bright — Senior Barber', 'Senior chair · Suite K-5, 4th floor', 'lounge', '/img/barber-starkid.jpg', null, 8);
  end if;
end; $$;

-- Ads / announcements (7) — seeded only when the table is empty
do $$ begin
  if not exists (select 1 from public.ads) then
    insert into public.ads (title, placement, service_id, sort) values ('Bring 2 friends — your Classic Shave is complimentary', 'ticker', 'freefriend', 0);
    insert into public.ads (title, placement, service_id, sort) values ('3-Person Haircut Package · KSh 3,000 · 90 min', 'ticker', 'group3', 1);
    insert into public.ads (title, placement, service_id, sort) values ('The Mbogi Experience: 3 student haircuts · KSh 2,500 · Mon–Wed · ID optional', 'ticker', 'student', 2);
    insert into public.ads (title, placement, service_id, sort) values ('Walk-ins welcome Mon–Sat · 8:00 am – 8:00 pm (Thu from 8:30 am)', 'ticker', null, 3);
    insert into public.ads (title, placement, service_id, sort) values ('Sunday: By Appointment Only! Premium Rates Apply. Book a day ahead — 0741578791', 'ticker', null, 4);
    insert into public.ads (title, placement, service_id, sort) values ('Free coffee, tea, light bites & aftershave massage with every service', 'ticker', null, 5);
    insert into public.ads (title, placement, service_id, sort) values ('Rated 5.0 ★★★★★ on Google', 'ticker', null, 6);
  end if;
end; $$;

-- Reviews (9) — seeded only when the table is empty
do $$ begin
  if not exists (select 1 from public.reviews) then
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('Brian Mwangi', 'Nairobi CBD', 'BM', '#c9a24d', 5, '1w ago', 'Bespoke Haircut', '“Sharpest fade I have had in town. Consultation first, razor line-up, hot towel finish — and the coffee is genuinely free. This is my weekly chair now.”', 0);
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('Abdirahman Noor', 'Eastleigh, Nairobi', 'AB', '#7a9cc6', 5, '1w ago', 'Beard Sculpt & Trim', '“Alphie shaped my beard exactly how I like it and finished with a straight razor — clean, patient, zero rush. A premium lounge that respects your style and your time.”', 1);
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('Samuel Kiprop', 'Upper Hill, Nairobi', 'SK', '#8fbf7f', 5, '2w ago', 'VIP Experience II', '“Took the Complete Gentleman before my wedding — shave, facial, mani-pedi and massage in one sitting. Worth every shilling. Five stars, no debate.”', 2);
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('Daniel Bennett', 'Visiting from London', 'DB', '#c67b5c', 5, '2w ago', 'Gentleman''s Cut', '“Found Fresh Start on Google while in Nairobi for work and walked in. Standards I would happily pay London prices for — precise cut, hot towel, immaculate lounge.”', 3);
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('Yusuf Abdi', 'South C, Nairobi', 'YA', '#9b8fd4', 5, '3w ago', 'Referral — Free Classic Shave', '“Brought two of my boys for bespoke cuts and my classic shave was complimentary, exactly as promised. Coffee on arrival, shoulder massage after. We are regulars now.”', 4);
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('Anthony Mutua', 'South B, Nairobi', 'AM', '#d4b15c', 5, '1mo ago', 'The Mbogi Experience', '“Three of us did the Mbogi Experience on a Tuesday — three clean student cuts for KSh 2,500, student ID optional. Mike will fade it blends a fade like nobody else.”', 5);
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('Omar Haddad', 'Visiting from Dubai', 'Omar Haddad', '#5cb8a6', 5, '1mo ago', 'Sunday Premium Appointment', '“Booked the Sunday premium appointment a day ahead and the team confirmed everything on WhatsApp. Facial and massage in total privacy — five-star, discreet, worth it.”', 6);
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('James Mwangi', 'Ruiru, Kiambu', 'JW', '#c65c7b', 5, '2mo ago', 'Skin Fade & Line-Up', '“Starkid’s fades are architectural. Lines stayed crisp for weeks. Walked in on a Saturday and was in the chair fast. Highly recommend.”', 7);
    insert into public.reviews (name, area, initials, hue, stars, when_label, service, body, sort)
    values ('Lukas Meyer', 'Visiting from Berlin', 'LM', '#6f9fd8', 5, '2mo ago', 'Caucasian Haircut', '“Finally a Nairobi barber who truly understands fine-hair scissor work. Proper taper, proper texturing, and a hot-towel finish. World-class — five stars.”', 8);
  end if;
end; $$;
