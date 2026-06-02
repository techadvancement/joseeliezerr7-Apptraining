-- Training App — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Idempotent: safe to re-run on existing installs (adds missing columns/tables/policies).
-- Creates: profiles (+role), video_categories, videos (+series link), manuals, series,
--          bookmarks, video_notes, video_progress, admin RPCs + RLS.

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  country text not null,
  phone text,
  avatar_url text,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger: keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile row on user sign-up (uses raw_user_meta_data)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, country, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'country', ''),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- video_categories ----------
create table if not exists public.video_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_es text not null,
  thumbnail_url text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.video_categories enable row level security;

drop policy if exists "video_categories_read_authd" on public.video_categories;
create policy "video_categories_read_authd" on public.video_categories
  for select to authenticated using (true);

-- ---------- videos ----------
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.video_categories(id) on delete cascade,
  title_en text not null,
  title_es text not null,
  description_en text,
  description_es text,
  thumbnail_url text not null,
  video_url text not null,
  duration_seconds int not null default 0,
  size_bytes bigint,
  resolution text,
  instructor text,
  chapters jsonb,
  created_at timestamptz not null default now()
);

-- Backfill columns for existing installs
alter table public.videos add column if not exists instructor text;
alter table public.videos add column if not exists chapters jsonb;

create index if not exists videos_category_idx on public.videos(category_id);

alter table public.videos enable row level security;

drop policy if exists "videos_read_authd" on public.videos;
create policy "videos_read_authd" on public.videos
  for select to authenticated using (true);

-- ---------- manuals ----------
create table if not exists public.manuals (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_es text not null,
  description_en text,
  description_es text,
  thumbnail_url text not null,
  pdf_url_en text,
  pdf_url_es text,
  page_count int,
  created_at timestamptz not null default now()
);

alter table public.manuals enable row level security;

drop policy if exists "manuals_read_authd" on public.manuals;
create policy "manuals_read_authd" on public.manuals
  for select to authenticated using (true);

-- ---------- Storage buckets ----------
-- Run these in the Storage UI or via SQL helpers; included here for reference.
-- insert into storage.buckets (id, name, public) values ('videos', 'videos', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('thumbnails', 'thumbnails', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('manuals', 'manuals', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
-- Allow users to read all avatars and upload only into their own folder (userId prefix):
-- create policy "avatars_read" on storage.objects for select using (bucket_id = 'avatars');
-- create policy "avatars_upload_own" on storage.objects for insert
--   with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "avatars_update_own" on storage.objects for update
--   using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "avatars_delete_own" on storage.objects for delete
--   using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- bookmarks (favoritos) ----------
create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('video', 'manual')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks_own_read" on public.bookmarks;
create policy "bookmarks_own_read" on public.bookmarks
  for select using (auth.uid() = user_id);

drop policy if exists "bookmarks_own_write" on public.bookmarks;
create policy "bookmarks_own_write" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists bookmarks_user_idx on public.bookmarks(user_id, created_at desc);

-- ---------- video_notes (notas personales por video) ----------
create table if not exists public.video_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table public.video_notes enable row level security;

drop policy if exists "video_notes_own_read" on public.video_notes;
create policy "video_notes_own_read" on public.video_notes
  for select using (auth.uid() = user_id);

drop policy if exists "video_notes_own_write" on public.video_notes;
create policy "video_notes_own_write" on public.video_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trg_notes_updated_at on public.video_notes;
create trigger trg_notes_updated_at before update on public.video_notes
  for each row execute function public.set_updated_at();

-- ---------- video_progress (continue watching) ----------
create table if not exists public.video_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  position_seconds int not null default 0,
  duration_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table public.video_progress enable row level security;

drop policy if exists "video_progress_own_read" on public.video_progress;
create policy "video_progress_own_read" on public.video_progress
  for select using (auth.uid() = user_id);

drop policy if exists "video_progress_own_write" on public.video_progress;
create policy "video_progress_own_write" on public.video_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists video_progress_user_updated_idx
  on public.video_progress(user_id, updated_at desc);

drop trigger if exists trg_progress_updated_at on public.video_progress;
create trigger trg_progress_updated_at before update on public.video_progress
  for each row execute function public.set_updated_at();

-- ---------- delete_account RPC ----------
-- Lets the authenticated user delete their own auth user (and cascade their profile).
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;

-- ---------- profiles.role + is_admin() helper ----------
-- App code (`lib/auth.tsx`, `lib/admin.ts`) reads/writes `profiles.role` and the admin
-- panel gates on `role === 'admin'`. Defaults to 'user' so existing rows backfill safely.
alter table public.profiles
  add column if not exists role text not null default 'user';

-- Add the check constraint only once.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user','admin'));
  end if;
end $$;

-- Partial index: only non-default ('admin') rows take space.
create index if not exists profiles_role_idx on public.profiles(role) where role <> 'user';

-- Helper: is the current authenticated user an admin?
-- security definer so it can read profiles even when RLS would block; coalesce so a
-- missing profile row returns false instead of NULL (otherwise policies short-circuit oddly).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admins can read every profile (for the admin users list + stats count).
drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all" on public.profiles
  for select to authenticated using (public.is_admin());

-- ---------- series ----------
-- Used by `lib/api.ts` (`fetchSeries`, `fetchSeriesById`, `fetchSeriesVideos`)
-- and the admin/series CRUD in `lib/admin.ts`.
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_es text not null,
  description_en text,
  description_es text,
  thumbnail_url text,
  category_id uuid references public.video_categories(id) on delete set null,
  order_index int not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists series_category_idx on public.series(category_id);
create index if not exists series_featured_idx on public.series(featured) where featured;
create index if not exists series_order_idx on public.series(order_index);

alter table public.series enable row level security;

drop policy if exists "series_read_authd" on public.series;
create policy "series_read_authd" on public.series
  for select to authenticated using (true);

drop policy if exists "series_admin_all" on public.series;
create policy "series_admin_all" on public.series
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_series_updated_at on public.series;
create trigger trg_series_updated_at before update on public.series
  for each row execute function public.set_updated_at();

-- ---------- videos: series link ----------
-- Added after the initial schema; videos can belong to at most one series with a position.
alter table public.videos add column if not exists series_id uuid
  references public.series(id) on delete set null;
alter table public.videos add column if not exists series_position int;
create index if not exists videos_series_idx on public.videos(series_id, series_position);

-- ---------- admin write policies on content tables ----------
-- Reads stay open to any authenticated user; writes require role='admin'.
drop policy if exists "video_categories_admin_all" on public.video_categories;
create policy "video_categories_admin_all" on public.video_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "videos_admin_all" on public.videos;
create policy "videos_admin_all" on public.videos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "manuals_admin_all" on public.manuals;
create policy "manuals_admin_all" on public.manuals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- admin_users_view ----------
-- View joining auth.users + profiles for admin user management. Returned by admin_list_users().
create or replace view public.admin_users_view as
  select
    p.id,
    u.email,
    u.created_at as signed_up_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    p.full_name,
    p.country,
    p.phone,
    p.avatar_url,
    p.role,
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.id;

-- ---------- admin_list_users RPC ----------
-- Returns the admin_users_view, admin-only. security definer required because the view
-- joins auth.users (not readable by `authenticated` role directly).
create or replace function public.admin_list_users()
returns setof public.admin_users_view
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query select * from public.admin_users_view order by signed_up_at desc;
end $$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

-- ---------- admin_set_user_role RPC ----------
-- Protects against admin demoting themselves (would lock the org out of admin features).
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_role not in ('user','admin') then
    raise exception 'invalid role';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot demote yourself';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end $$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- ---------- admin_delete_user RPC ----------
-- Cascades to public.profiles via FK on auth.users(id).
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot delete yourself';
  end if;
  delete from auth.users where id = p_user_id;
end $$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------- Bootstrap your first admin ----------
-- After running this script on a fresh install, manually promote your own user once:
--
--   update public.profiles set role = 'admin' where id = '<your-auth-user-uuid>';
--
-- From then on, the admin panel and admin_* RPCs work for that user, and you can
-- promote additional admins from the in-app users screen.

-- ---------- Sample seed (optional) ----------
-- insert into public.video_categories (slug, name_en, name_es, thumbnail_url, order_index) values
--   ('onboarding', 'Onboarding', 'Inducción', null, 1),
--   ('sales', 'Sales', 'Ventas', null, 2);
