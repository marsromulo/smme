create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('issuances', 'news')),
  title text not null,
  content text,
  article_date date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_category_date_idx
  on public.articles(category, article_date desc, created_at desc);

create table if not exists public.article_images (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  object_key text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  upload_status text not null default 'pending'
    check (upload_status in ('pending', 'uploaded')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz
);

create index if not exists article_images_article_idx
  on public.article_images(article_id, sort_order, created_at);

alter table public.articles enable row level security;
alter table public.article_images enable row level security;

drop policy if exists "articles are publicly readable" on public.articles;
create policy "articles are publicly readable"
  on public.articles for select
  using (true);

drop policy if exists "article images are publicly readable" on public.article_images;
create policy "article images are publicly readable"
  on public.article_images for select
  using (upload_status = 'uploaded');

drop policy if exists "admins manage articles" on public.articles;
create policy "admins manage articles"
  on public.articles for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins manage article images" on public.article_images;
create policy "admins manage article images"
  on public.article_images for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
