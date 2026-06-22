create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('active', 'draft', 'archived')),
  target_users text not null default 'schools',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_required_documents (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  description text,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, name)
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

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists set_service_required_documents_updated_at on public.service_required_documents;
create trigger set_service_required_documents_updated_at
before update on public.service_required_documents
for each row execute function public.set_updated_at();

create index if not exists services_status_idx on public.services(status);
create index if not exists services_sort_order_idx on public.services(sort_order);
create index if not exists service_required_documents_service_id_idx
  on public.service_required_documents(service_id, sort_order);

alter table public.services enable row level security;
alter table public.service_required_documents enable row level security;

drop policy if exists "Authenticated users can read active services"
  on public.services;
create policy "Authenticated users can read active services"
  on public.services
  for select
  to authenticated
  using (status = 'active' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Authenticated users can read service documents"
  on public.service_required_documents;
create policy "Authenticated users can read service documents"
  on public.service_required_documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.services s
      where s.id = service_required_documents.service_id
        and (s.status = 'active' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    )
  );

drop policy if exists "Admins can insert services" on public.services;
create policy "Admins can insert services"
  on public.services
  for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update services" on public.services;
create policy "Admins can update services"
  on public.services
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete services" on public.services;
create policy "Admins can delete services"
  on public.services
  for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can insert service documents" on public.service_required_documents;
create policy "Admins can insert service documents"
  on public.service_required_documents
  for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update service documents" on public.service_required_documents;
create policy "Admins can update service documents"
  on public.service_required_documents
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete service documents" on public.service_required_documents;
create policy "Admins can delete service documents"
  on public.service_required_documents
  for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into public.services (code, name, description, status, target_users, sort_order)
values
  ('GPO', 'Government Permit to Operate', 'Application for authority to legally operate a school or learning center.', 'active', 'public-schools', 10),
  ('REC', 'Recognition of schools and programs', 'Recognition request for schools and academic programs that require DepEd validation.', 'active', 'public-schools', 20),
  ('TOSFI', 'Tuition and Other School Fees Increase (TOSFI)', 'Application for tuition and other school fees increase review and approval.', 'active', 'public-schools', 30),
  ('NEW', 'Establishment of new schools, branches, and additional programs', 'Application for new schools, branch campuses, or additional academic programs.', 'active', 'public-schools', 40),
  ('CHG', 'Change of school name, ownership, or location', 'Request for approval of institutional name, ownership, or location changes.', 'active', 'public-schools', 50),
  ('SHS', 'Senior High School permit applications', 'Application for authority to offer Senior High School programs.', 'active', 'public-schools', 60)
on conflict (code) do nothing;

insert into public.service_required_documents (service_id, name, sort_order)
select s.id, d.name, d.sort_order
from (
  values
    ('GPO', 'Application form', 10),
    ('GPO', 'School profile', 20),
    ('GPO', 'Business permit or SEC/DTI registration', 30),
    ('GPO', 'Fire safety inspection certificate', 40),
    ('GPO', 'Site validation report', 50),
    ('REC', 'Recognition application letter', 10),
    ('REC', 'Program offering matrix', 20),
    ('REC', 'Faculty roster', 30),
    ('REC', 'Curriculum and learning resources inventory', 40),
    ('REC', 'Facilities and room utilization report', 50),
    ('TOSFI', 'TOSFI application form', 10),
    ('TOSFI', 'Comparative fee schedule', 20),
    ('TOSFI', 'Consultation minutes', 30),
    ('TOSFI', 'Audited financial statement', 40),
    ('TOSFI', 'Parent notification proof', 50),
    ('NEW', 'Intent letter', 10),
    ('NEW', 'Feasibility study', 20),
    ('NEW', 'Proposed program details', 30),
    ('NEW', 'Site ownership or lease documents', 40),
    ('NEW', 'Inspection and evaluation checklist', 50),
    ('CHG', 'Board resolution', 10),
    ('CHG', 'Updated permits and registrations', 20),
    ('CHG', 'Transfer or ownership documents', 30),
    ('CHG', 'Stakeholder notification proof', 40),
    ('CHG', 'Updated school profile', 50),
    ('SHS', 'SHS permit application', 10),
    ('SHS', 'Track and strand proposal', 20),
    ('SHS', 'Faculty qualification documents', 30),
    ('SHS', 'Laboratory and equipment inventory', 40),
    ('SHS', 'Work immersion partnership documents', 50)
) as d(code, name, sort_order)
join public.services s on s.code = d.code
on conflict (service_id, name) do nothing;
