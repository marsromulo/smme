create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  target_users text not null default 'schools',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services drop constraint if exists services_status_check;
update public.services
set status = 'inactive'
where status in ('draft', 'archived');
alter table public.services
  add constraint services_status_check check (status in ('active', 'inactive'));

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

delete from public.service_required_documents;
delete from public.services;

insert into public.services (code, name, description, status, target_users, sort_order)
values
  ('GPO-NEW', 'Government Permit to Operate (New School/Additional Grade Level)', 'Required documents for Government Permit to Operate (New School/Additional Grade Level).', 'active', 'public-schools', 1),
  ('REC', 'Government Recognition', 'Required documents for Government Recognition.', 'active', 'public-schools', 2),
  ('TOSFI', 'Tuition and Other School Fees Increase (TOSFI)', 'Required documents for Tuition and Other School Fees Increase (TOSFI).', 'active', 'public-schools', 3),
  ('BRANCH', 'Establishment of Branches or Additional Programs', 'Required documents for Establishment of Branches or Additional Programs.', 'active', 'public-schools', 4),
  ('NAME', 'Change of School Name', 'Required documents for Change of School Name.', 'active', 'public-schools', 5),
  ('OWNER', 'Change of Ownership', 'Required documents for Change of Ownership.', 'active', 'public-schools', 6),
  ('LOCATION', 'Change of Location', 'Required documents for Change of Location.', 'active', 'public-schools', 7),
  ('SHS', 'Senior High School Permit Application', 'Required documents for Senior High School Permit Application.', 'active', 'public-schools', 8),
  ('CALENDAR', 'School Calendar', 'Required documents for School Calendar.', 'active', 'public-schools', 9),
  ('REMEDIAL', 'Application for Remedial/ Advancement Classes', 'Required documents for Application for Remedial/ Advancement Classes.', 'active', 'public-schools', 10);

insert into public.service_required_documents (service_id, name, sort_order)
select s.id, d.name, d.sort_order
from (
  values
    ('GPO-NEW', 'Letter of Intent addressed to the Regional Director through the Schools Division Superintendent', 1),
    ('GPO-NEW', 'Board Resolution authorizing the opening of the school/program', 2),
    ('GPO-NEW', 'Articles of Incorporation and By-Laws registered with SEC (for corporations)', 3),
    ('GPO-NEW', 'DTI Registration (for sole proprietorship)', 4),
    ('GPO-NEW', 'Mayor''s Permit/Business Permit', 5),
    ('GPO-NEW', 'Transfer Certificate of Title (TCT), Deed of Sale, Lease Contract, or Proof of Ownership', 6),
    ('GPO-NEW', 'Comprehensive Feasibility Study', 7),
    ('GPO-NEW', 'Proposed School Calendar', 8),
    ('GPO-NEW', 'Organizational Chart', 9),
    ('GPO-NEW', 'Curriculum Offering', 10),
    ('GPO-NEW', 'List of Administrators, Teaching and Non-Teaching Personnel with qualifications', 11),
    ('GPO-NEW', 'School Site Development Plan', 12),
    ('GPO-NEW', 'Inventory of Facilities, Laboratories, Library, and Equipment', 13),
    ('GPO-NEW', 'Fire Safety Inspection Certificate', 14),
    ('GPO-NEW', 'Sanitary Permit/Health Certificate', 15),
    ('GPO-NEW', 'Photographs of school buildings and facilities', 16),
    ('GPO-NEW', 'Enrollment Projection', 17),
    ('GPO-NEW', 'Tuition and Other School Fees Schedule', 18),
    ('GPO-NEW', 'Financial Statement or Proof of Financial Capability', 19),
    ('GPO-NEW', 'Division Evaluation Report and Endorsement', 20),
    ('REC', 'Application Letter for Recognition', 1),
    ('REC', 'Existing Government Permit', 2),
    ('REC', 'Board Resolution requesting recognition', 3),
    ('REC', 'Accomplishment Report', 4),
    ('REC', 'List of graduates and enrollment history', 5),
    ('REC', 'Faculty Profile and Credentials', 6),
    ('REC', 'Updated Curriculum', 7),
    ('REC', 'Inventory of Facilities and Equipment', 8),
    ('REC', 'Library Holdings and Learning Resources', 9),
    ('REC', 'School Site Ownership or Lease Documents', 10),
    ('REC', 'Fire Safety and Sanitary Certificates', 11),
    ('REC', 'School Financial Statements', 12),
    ('REC', 'Latest Inspection and Monitoring Reports', 13),
    ('REC', 'Division Endorsement', 14),
    ('REC', 'Subject to validation by the Regional Office.', 15),
    ('TOSFI', 'Letter-request signed by School Head', 1),
    ('TOSFI', 'Board Resolution approving proposed increase', 2),
    ('TOSFI', 'Comparative Schedule of Existing and Proposed Fees', 3),
    ('TOSFI', 'Detailed Justification for Increase', 4),
    ('TOSFI', 'Financial Statements (audited, previous years)', 5),
    ('TOSFI', 'Consultation Documents with Parents, Students, and Teachers', 6),
    ('TOSFI', 'Minutes of Consultation Meeting', 7),
    ('TOSFI', 'Attendance Sheets', 8),
    ('TOSFI', 'Certification of Compliance with Consultation Requirements', 9),
    ('TOSFI', 'Utilization Plan of Incremental Proceeds', 10),
    ('TOSFI', 'Projected Income and Expenditures', 11),
    ('BRANCH', 'Letter of Application', 1),
    ('BRANCH', 'Board Resolution', 2),
    ('BRANCH', 'Existing Government Recognition', 3),
    ('BRANCH', 'Feasibility Study', 4),
    ('BRANCH', 'Proposed Curriculum', 5),
    ('BRANCH', 'School Site Ownership/Lease Documents', 6),
    ('BRANCH', 'Floor Plan and Building Plan', 7),
    ('BRANCH', 'List of Personnel and Qualifications', 8),
    ('BRANCH', 'Inventory of Facilities and Equipment', 9),
    ('BRANCH', 'Financial Capability Documents', 10),
    ('BRANCH', 'Fire Safety Inspection Certificate', 11),
    ('BRANCH', 'Sanitary Permit', 12),
    ('BRANCH', 'Enrollment Projection', 13),
    ('BRANCH', 'Proposed Tuition Fees', 14),
    ('BRANCH', 'Division Evaluation and Endorsement', 15),
    ('NAME', 'Letter-request', 1),
    ('NAME', 'Board Resolution', 2),
    ('NAME', 'SEC Amendment or DTI Amendment', 3),
    ('NAME', 'Existing Government Recognition/Permit', 4),
    ('NAME', 'Division endorsement', 5),
    ('OWNER', 'Letter-request', 1),
    ('OWNER', 'Deed of Sale/Transfer', 2),
    ('OWNER', 'Board Resolution', 3),
    ('OWNER', 'SEC Documents of New Corporation', 4),
    ('OWNER', 'Financial Capability Documents', 5),
    ('OWNER', 'Existing Permit/Recognition', 6),
    ('OWNER', 'Division endorsement', 7),
    ('LOCATION', 'Letter-request', 1),
    ('LOCATION', 'Board Resolution', 2),
    ('LOCATION', 'TCT or Lease Contract of New Site', 3),
    ('LOCATION', 'Site Development Plan', 4),
    ('LOCATION', 'Fire Safety Inspection Certificate', 5),
    ('LOCATION', 'Sanitary Permit', 6),
    ('LOCATION', 'Photos of Facilities', 7),
    ('LOCATION', 'Ocular Inspection Report', 8),
    ('SHS', 'Letter of Application signed by School Head', 1),
    ('SHS', 'Board Resolution indicating tracks and strands to be offered', 2),
    ('SHS', 'Existing Recognition in Basic Education or Accreditation', 3),
    ('SHS', 'Proposed Tuition and Other School Fees', 4),
    ('SHS', 'School Calendar', 5),
    ('SHS', 'List of Academic and Non-Academic Personnel', 6),
    ('SHS', 'Faculty Qualifications and Teaching Loads', 7),
    ('SHS', 'Inventory of Classrooms, Laboratories, Workshops, Library and Equipment', 8),
    ('SHS', 'Internet Connectivity Facilities', 9),
    ('SHS', 'Curriculum and Program Offerings', 10),
    ('SHS', 'Memorandum of Agreement (MOA) with Industry Partners or HEIs, if applicable', 11),
    ('SHS', 'Career Guidance and Youth Formation Plan', 12),
    ('SHS', 'Facilities and Safety Documents', 13),
    ('SHS', 'Division Endorsement', 14),
    ('CALENDAR', 'School Calendar', 1),
    ('REMEDIAL', 'Application for Remedial/ Advancement Classes', 1)
) as d(code, name, sort_order)
join public.services s on s.code = d.code;
