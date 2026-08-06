# Supabase Setup

Run `supabase/001_school_registration.sql` in the Supabase SQL editor or through your migration workflow.

Run `supabase/004_articles.sql` to enable managed Issuances & Documents and News & Updates articles with image records.

Run `supabase/005_article_reads.sql` to enable per-school unread article badges.

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is supported as a legacy fallback for `SUPABASE_SECRET_KEY`.
