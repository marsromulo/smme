create extension if not exists pgcrypto;

create table if not exists public.school_registration_requests (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  school_id text,
  school_type text,
  school_district text,
  school_address text,
  school_offerings text[] not null default '{}',
  representative_name text not null,
  representative_position text,
  representative_email text not null,
  contact_number text,
  status text not null default 'new'
    check (status in ('new', 'pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.school_registration_requests
  add column if not exists school_type text,
  add column if not exists school_district text,
  add column if not exists school_address text,
  add column if not exists school_offerings text[] not null default '{}',
  add column if not exists representative_position text;

alter table public.school_registration_requests drop constraint if exists school_registration_requests_status_check;
alter table public.school_registration_requests
  alter column status set default 'new';
alter table public.school_registration_requests
  add constraint school_registration_requests_status_check
  check (status in ('new', 'pending', 'approved', 'rejected'));

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  school_registration_request_id uuid unique references public.school_registration_requests(id) on delete set null,
  slug text not null unique,
  school_name text not null,
  school_id text,
  school_type text,
  school_district text,
  school_address text,
  school_offerings text[] not null default '{}',
  representative_name text not null,
  representative_position text,
  representative_email text not null,
  contact_number text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'for_validation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schools
  add column if not exists school_registration_request_id uuid references public.school_registration_requests(id) on delete set null,
  add column if not exists slug text,
  add column if not exists school_name text,
  add column if not exists school_id text,
  add column if not exists school_type text,
  add column if not exists school_district text,
  add column if not exists school_address text,
  add column if not exists school_offerings text[] not null default '{}',
  add column if not exists representative_name text,
  add column if not exists representative_position text,
  add column if not exists representative_email text,
  add column if not exists contact_number text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text not null,
  school_registration_request_id uuid references public.school_registration_requests(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.school_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  school_registration_request_id uuid references public.school_registration_requests(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_school_registration_requests_updated_at on public.school_registration_requests;
create trigger set_school_registration_requests_updated_at
before update on public.school_registration_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_schools_updated_at on public.schools;
create trigger set_schools_updated_at
before update on public.schools
for each row execute function public.set_updated_at();

create index if not exists school_registration_requests_status_idx
  on public.school_registration_requests(status);

create index if not exists school_registration_requests_created_at_idx
  on public.school_registration_requests(created_at desc);

create unique index if not exists schools_school_registration_request_id_key
  on public.schools(school_registration_request_id)
  where school_registration_request_id is not null;

create unique index if not exists schools_slug_key
  on public.schools(slug);

create index if not exists schools_created_at_idx
  on public.schools(created_at desc);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications(created_at desc);

create index if not exists school_notifications_recipient_read_idx
  on public.school_notifications(recipient_user_id, is_read, created_at desc);

alter table public.school_registration_requests enable row level security;
alter table public.schools enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.school_notifications enable row level security;

drop policy if exists "Anyone can submit school registration requests"
  on public.school_registration_requests;
create policy "Anyone can submit school registration requests"
  on public.school_registration_requests
  for insert
  to anon, authenticated
  with check (status = 'new');

drop policy if exists "Admins can read school registration requests"
  on public.school_registration_requests;
create policy "Admins can read school registration requests"
  on public.school_registration_requests
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update school registration requests"
  on public.school_registration_requests;
create policy "Admins can update school registration requests"
  on public.school_registration_requests
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can read schools"
  on public.schools;
create policy "Admins can read schools"
  on public.schools
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can insert schools"
  on public.schools;
create policy "Admins can insert schools"
  on public.schools
  for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update schools"
  on public.schools;
create policy "Admins can update schools"
  on public.schools
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can read admin notifications"
  on public.admin_notifications;
create policy "Admins can read admin notifications"
  on public.admin_notifications
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Schools can read own notifications"
  on public.school_notifications;
create policy "Schools can read own notifications"
  on public.school_notifications
  for select
  to authenticated
  using (
    recipient_user_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'school'
  );

drop policy if exists "Schools can update own notifications"
  on public.school_notifications;
create policy "Schools can update own notifications"
  on public.school_notifications
  for update
  to authenticated
  using (
    recipient_user_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'school'
  )
  with check (
    recipient_user_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'school'
  );

notify pgrst, 'reload schema';
