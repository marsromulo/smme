-- Run after 006_school_statuses.sql, before deploying the updated application.
-- Existing records remain valid; unknown owner/calendar information is left null.
begin;

alter table public.school_registration_requests
  add column if not exists registrant_type text check (registrant_type in ('owner', 'representative')),
  add column if not exists owner_name text,
  add column if not exists owner_home_address text,
  add column if not exists owner_contact_number text;

alter table public.schools
  add column if not exists registrant_type text check (registrant_type in ('owner', 'representative')),
  add column if not exists owner_name text,
  add column if not exists owner_home_address text,
  add column if not exists owner_contact_number text;

alter table public.service_applications
  add column if not exists school_calendar jsonb
  check (school_calendar is null or jsonb_typeof(school_calendar) = 'object');

comment on column public.service_applications.school_calendar is
  'School Calendar details: startDate and endDate (YYYY-MM-DD), schoolDays (positive integer).';

notify pgrst, 'reload schema';
commit;
