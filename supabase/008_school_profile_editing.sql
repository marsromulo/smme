-- Run after 007_registrant_calendar.sql and before deploying profile editing.
begin;

alter table public.school_registration_requests add column if not exists home_address text;
alter table public.schools add column if not exists home_address text;

-- Legacy representative addresses described the owner, so do not relabel them.
update public.school_registration_requests set home_address = owner_home_address
where home_address is null and registrant_type = 'owner';
update public.schools set home_address = owner_home_address
where home_address is null and registrant_type = 'owner';

-- Called only by the authenticated server endpoint using its service role.
-- Both records are updated in one transaction; identity and approval fields are untouched.
create or replace function public.update_school_profile(account_email text, profile jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  school_record_id uuid;
  registration_id uuid;
begin
  select id, school_registration_request_id into school_record_id, registration_id
  from public.schools
  where representative_email = account_email
  order by created_at desc limit 1
  for update;

  if school_record_id is null then
    select id into registration_id
    from public.school_registration_requests
    where representative_email = account_email and status = 'approved'
    order by created_at desc limit 1
    for update;
  end if;

  if school_record_id is null and registration_id is null then
    raise exception 'No school profile is connected to this account.' using errcode = 'P0002';
  end if;

  if school_record_id is not null then
    update public.schools set
      registrant_type = profile ->> 'registrant_type',
      owner_name = profile ->> 'owner_name',
      representative_name = profile ->> 'representative_name',
      home_address = profile ->> 'home_address',
      contact_number = profile ->> 'contact_number',
      school_district = profile ->> 'school_district',
      school_address = profile ->> 'school_address',
      representative_position = profile ->> 'representative_position',
      school_offerings = array(select jsonb_array_elements_text(profile -> 'school_offerings')),
      school_statuses = profile -> 'school_statuses'
    where id = school_record_id and representative_email = account_email;
  end if;

  if registration_id is not null then
    update public.school_registration_requests set
      registrant_type = profile ->> 'registrant_type',
      owner_name = profile ->> 'owner_name',
      representative_name = profile ->> 'representative_name',
      home_address = profile ->> 'home_address',
      contact_number = profile ->> 'contact_number',
      school_district = profile ->> 'school_district',
      school_address = profile ->> 'school_address',
      representative_position = profile ->> 'representative_position',
      school_offerings = array(select jsonb_array_elements_text(profile -> 'school_offerings')),
      school_statuses = profile -> 'school_statuses'
    where id = registration_id and representative_email = account_email;
  end if;
end;
$$;

revoke all on function public.update_school_profile(text, jsonb) from public, anon, authenticated;
grant execute on function public.update_school_profile(text, jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
