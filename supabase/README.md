# Supabase Setup

Run `supabase/001_school_registration.sql` in the Supabase SQL editor or through your migration workflow.

Run `supabase/004_articles.sql` to enable managed Issuances & Documents and News & Updates articles with image records.

Run `supabase/005_article_reads.sql` to enable per-school unread article badges.

Run `supabase/006_school_statuses.sql` for registration participation statuses.

Run `supabase/007_registrant_calendar.sql` for registrant type, school owner details, and School Calendar application details before deploying the updated app. Existing records remain valid with unknown details left empty.

Run `supabase/008_school_profile_editing.sql` for shared registrant home addresses and school profile editing. It keeps linked school and registration records in sync when a school saves its profile.

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is supported as a legacy fallback for `SUPABASE_SECRET_KEY`.
