-- Kisumu Stays marketplace schema extension (starter; review and test before production)
-- Run AFTER the existing docs/supabase-schema.sql. Do not expose service-role credentials.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  role text not null default 'guest' check (role in ('guest','owner','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null,
  description text,
  nightly_rate integer not null check (nightly_rate > 0),
  max_guests integer not null default 2 check (max_guests > 0),
  image_urls text[] not null default '{}',
  amenities text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 5 and 2000),
  owner_response text,
  moderation_status text not null default 'pending' check (moderation_status in ('pending','published','hidden','reported')),
  created_at timestamptz not null default now(),
  unique (booking_id, guest_id)
);

create table if not exists public.payment_review_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  event_type text not null check (event_type in ('verification_requested','verified','failed','mismatch','refund_requested','refunded','dispute_opened','note')),
  note text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Safe role helper avoids querying profiles recursively from an RLS policy.
create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') $$;
revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.guest_reviews enable row level security;
alter table public.payment_review_events enable row level security;

-- Profiles: users can read/update their own basic profile; role cannot be changed by client policies.
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;
drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles for select to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());
drop policy if exists profiles_insert_self_guest on public.profiles;
create policy profiles_insert_self_guest on public.profiles for insert to authenticated
with check (user_id = auth.uid() and role = 'guest');
drop policy if exists profiles_update_self_basic on public.profiles;
create policy profiles_update_self_basic on public.profiles for update to authenticated
using (user_id = auth.uid() or public.current_user_is_admin())
with check ((user_id = auth.uid() and role = 'guest') or public.current_user_is_admin());

-- Properties: public can read only approved listings; owners manage their own non-admin records.
revoke all on public.properties from anon, authenticated;
grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;
create policy properties_public_approved on public.properties for select to anon, authenticated
using (status = 'approved' or owner_id = auth.uid() or public.current_user_is_admin());
create policy properties_owner_insert on public.properties for insert to authenticated
with check (owner_id = auth.uid() and status = 'pending');
create policy properties_owner_update on public.properties for update to authenticated
using (owner_id = auth.uid() or public.current_user_is_admin())
with check (owner_id = auth.uid() or public.current_user_is_admin());
create policy properties_owner_delete on public.properties for delete to authenticated
using (owner_id = auth.uid() or public.current_user_is_admin());

-- Reviews: published reviews visible publicly; a guest can create only their own review row.
revoke all on public.guest_reviews from anon, authenticated;
grant select on public.guest_reviews to anon, authenticated;
grant insert, update on public.guest_reviews to authenticated;
create policy reviews_public_published on public.guest_reviews for select to anon, authenticated
using (moderation_status = 'published' or guest_id = auth.uid() or public.current_user_is_admin());
create policy reviews_guest_insert_pending on public.guest_reviews for insert to authenticated
with check (guest_id = auth.uid() and moderation_status = 'pending');
create policy reviews_owner_response_or_admin on public.guest_reviews for update to authenticated
using (public.current_user_is_admin() or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
with check (public.current_user_is_admin() or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

-- Payment review audit events are private; only server-side service role can write them.
revoke all on public.payment_review_events from anon, authenticated;
grant select on public.payment_review_events to authenticated;
create policy payment_events_admin_read on public.payment_review_events for select to authenticated
using (public.current_user_is_admin());
grant all on public.payment_review_events to service_role;

-- IMPORTANT: test all policies with separate guest, owner, and admin accounts before production.
-- Never give a public signup flow the ability to assign role='admin'.
