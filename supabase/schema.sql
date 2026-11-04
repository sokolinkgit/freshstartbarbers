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
