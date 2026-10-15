-- Kisumu Stays production booking/payment schema.
-- Run this in Supabase SQL Editor before setting deployment secrets.
create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  property_id text not null,
  property_name text not null,
  guest_name text not null,
  guest_phone text not null,
  check_in date not null,
  check_out date not null,
  nights integer not null check (nights between 1 and 30),
  guests integer not null check (guests >= 1),
  nightly_rate integer not null check (nightly_rate > 0),
  total_amount integer not null check (total_amount > 0),
  commission_rate numeric(5,4) not null default 0.10,
  commission_amount integer not null check (commission_amount >= 0),
  payment_status text not null default 'not_requested' check (payment_status in ('not_requested','initiating','pending','verification_pending','paid','failed','review_required','refunded')),
  booking_status text not null default 'requested' check (booking_status in ('requested','confirmed','cancelled','completed','disputed')),
  checkout_request_id text unique,
  merchant_request_id text,
  mpesa_receipt text unique,
  paid_amount integer,
  payer_phone_verified text,
  callback_amount integer,
  callback_receipt text,
  callback_phone text,
  callback_result_code text,
  callback_result_desc text,
  payment_note text
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_payment_status_idx on public.bookings (payment_status);
create index if not exists bookings_check_in_idx on public.bookings (check_in);

-- No public access. Only Netlify server functions use the Supabase service role key.
alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;
-- Never place SUPABASE_SERVICE_ROLE_KEY in site/data.js or any browser JavaScript.


create table if not exists public.payment_attempts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash text not null,
  phone_hash text not null
);
create index if not exists payment_attempts_ip_created_idx on public.payment_attempts (ip_hash, created_at desc);
create index if not exists payment_attempts_phone_created_idx on public.payment_attempts (phone_hash, created_at desc);
alter table public.payment_attempts enable row level security;
revoke all on public.payment_attempts from anon, authenticated;

-- Explicit service-role grants: only server functions use this elevated role.
grant all privileges on table public.bookings to service_role;
grant all privileges on table public.payment_attempts to service_role;
grant usage, select on sequence public.payment_attempts_id_seq to service_role;
