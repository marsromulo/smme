-- Run in the Supabase SQL Editor before deploying the registration update.
-- Existing records retain empty statuses, displayed as "Not provided".
-- Kindergarten uses the existing school_offerings text[] column.
begin;

alter table public.school_registration_requests
  add column if not exists school_statuses jsonb not null default '{}'::jsonb
  check (jsonb_typeof(school_statuses) = 'object');

alter table public.schools
  add column if not exists school_statuses jsonb not null default '{}'::jsonb
  check (jsonb_typeof(school_statuses) = 'object');

comment on column public.school_registration_requests.school_statuses is
  'Government recognition, ESC, and SHS voucher statuses. Keys: government, esc, shsVoucher; each has status and details.';
comment on column public.schools.school_statuses is
  'Status information copied from the registration on approval. Keys: government, esc, shsVoucher; each has status and details.';

notify pgrst, 'reload schema';
commit;
