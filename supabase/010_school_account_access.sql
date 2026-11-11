-- Block existing school JWTs at the database as soon as account access changes.
-- Approval and account activation remain separate server-managed auth metadata.
begin;
create or replace function public.platform_account_can_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and (
        u.raw_app_meta_data ->> 'role' = 'admin'
        or (
          u.raw_app_meta_data ->> 'account_status' = 'approved'
          and coalesce(u.raw_app_meta_data ->> 'account_active', 'true') <> 'false'
          and (u.banned_until is null or u.banned_until <= now())
        )
      )
  );
$$;
revoke all on function public.platform_account_can_access() from public, anon;
grant execute on function public.platform_account_can_access() to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'schools', 'school_registration_requests', 'admin_profiles',
    'admin_notifications', 'school_notifications', 'services',
    'service_required_documents', 'service_applications',
    'service_application_files', 'service_application_file_review_history',
    'articles', 'article_images', 'article_reads'
  ] loop
    execute format('drop policy if exists "Require active platform account" on public.%I', table_name);
    execute format(
      'create policy "Require active platform account" on public.%I as restrictive for all to authenticated using ((select public.platform_account_can_access())) with check ((select public.platform_account_can_access()))',
      table_name
    );
  end loop;
end $$;
commit;
