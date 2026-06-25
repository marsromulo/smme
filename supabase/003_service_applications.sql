create extension if not exists pgcrypto;

create table if not exists public.service_applications (
  id uuid primary key default gen_random_uuid(),
  school_user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_applications
  drop constraint if exists service_applications_status_check;

update public.service_applications
set status = case
  when status = 'approved' then 'approved'
  when status in ('rejected', 'returned') then 'rejected'
  else 'in_progress'
end;

alter table public.service_applications
  alter column status set default 'in_progress';

alter table public.service_applications
  add constraint service_applications_status_check
  check (status in ('in_progress', 'approved', 'rejected'));

create table if not exists public.service_application_files (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.service_applications(id) on delete cascade,
  service_required_document_id uuid references public.service_required_documents(id) on delete set null,
  original_name text not null,
  object_key text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  upload_status text not null default 'pending'
    check (upload_status in ('pending', 'uploaded', 'failed')),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'resubmit')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_application_files
  add column if not exists service_required_document_id uuid references public.service_required_documents(id) on delete set null,
  add column if not exists review_status text not null default 'pending',
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz;

alter table public.service_application_files
  drop constraint if exists service_application_files_review_status_check;

update public.service_application_files
set review_status = 'pending'
where review_status not in ('pending', 'approved', 'rejected', 'resubmit');

alter table public.service_application_files
  add constraint service_application_files_review_status_check
  check (review_status in ('pending', 'approved', 'rejected', 'resubmit'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_service_applications_updated_at on public.service_applications;
create trigger set_service_applications_updated_at
before update on public.service_applications
for each row execute function public.set_updated_at();

drop trigger if exists set_service_application_files_updated_at on public.service_application_files;
create trigger set_service_application_files_updated_at
before update on public.service_application_files
for each row execute function public.set_updated_at();

create index if not exists service_applications_school_user_idx
  on public.service_applications(school_user_id, created_at desc);

create index if not exists service_applications_service_idx
  on public.service_applications(service_id, created_at desc);

create index if not exists service_application_files_application_idx
  on public.service_application_files(application_id, created_at asc);

alter table public.service_applications enable row level security;
alter table public.service_application_files enable row level security;

drop policy if exists "Schools can read own service applications"
  on public.service_applications;
create policy "Schools can read own service applications"
  on public.service_applications
  for select
  to authenticated
  using (
    school_user_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'school'
  );

drop policy if exists "Schools can create own service applications"
  on public.service_applications;
create policy "Schools can create own service applications"
  on public.service_applications
  for insert
  to authenticated
  with check (
    school_user_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'school'
  );

drop policy if exists "Admins can read service applications"
  on public.service_applications;
create policy "Admins can read service applications"
  on public.service_applications
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update service applications"
  on public.service_applications;
create policy "Admins can update service applications"
  on public.service_applications
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Schools can read own service application files"
  on public.service_application_files;
create policy "Schools can read own service application files"
  on public.service_application_files
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.service_applications a
      where a.id = service_application_files.application_id
        and a.school_user_id = auth.uid()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'school'
    )
  );

drop policy if exists "Schools can create own service application files"
  on public.service_application_files;
create policy "Schools can create own service application files"
  on public.service_application_files
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.service_applications a
      where a.id = service_application_files.application_id
        and a.school_user_id = auth.uid()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'school'
    )
  );

drop policy if exists "Admins can read service application files"
  on public.service_application_files;
create policy "Admins can read service application files"
  on public.service_application_files
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update service application files"
  on public.service_application_files;
create policy "Admins can update service application files"
  on public.service_application_files
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

notify pgrst, 'reload schema';
