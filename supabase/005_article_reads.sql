create table if not exists public.article_reads (
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create index if not exists article_reads_user_idx
  on public.article_reads(user_id, read_at desc);

alter table public.article_reads enable row level security;

drop policy if exists "schools read their article history" on public.article_reads;
create policy "schools read their article history"
  on public.article_reads for select
  using (user_id = auth.uid());

drop policy if exists "schools mark articles read" on public.article_reads;
create policy "schools mark articles read"
  on public.article_reads for insert
  with check (user_id = auth.uid());

drop policy if exists "schools update their article history" on public.article_reads;
create policy "schools update their article history"
  on public.article_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
