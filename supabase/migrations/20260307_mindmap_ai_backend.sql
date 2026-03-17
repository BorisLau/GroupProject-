-- Mindmap AI backend tables and RLS policies
create extension if not exists pgcrypto;

create table if not exists public.user_ai_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  deepseek_api_key_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mindmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_file_name text not null,
  source_file_type text not null,
  model text not null,
  graph_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.mindmap_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('queued', 'processing', 'succeeded', 'failed')),
  file_name text not null,
  file_type text not null,
  title text,
  max_nodes integer,
  language text,
  error_message text,
  mindmap_id uuid references public.mindmaps (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists idx_mindmaps_user_id_created_at
  on public.mindmaps (user_id, created_at desc);

create index if not exists idx_mindmap_jobs_user_id_created_at
  on public.mindmap_jobs (user_id, created_at desc);

create index if not exists idx_mindmap_jobs_user_id_status
  on public.mindmap_jobs (user_id, status);

alter table public.user_ai_settings enable row level security;
alter table public.mindmaps enable row level security;
alter table public.mindmap_jobs enable row level security;

-- user_ai_settings policies
create policy if not exists "user_ai_settings_select_own"
  on public.user_ai_settings
  for select
  to authenticated
  using (user_id = auth.uid());

create policy if not exists "user_ai_settings_insert_own"
  on public.user_ai_settings
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy if not exists "user_ai_settings_update_own"
  on public.user_ai_settings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- mindmaps policies
create policy if not exists "mindmaps_select_own"
  on public.mindmaps
  for select
  to authenticated
  using (user_id = auth.uid());

create policy if not exists "mindmaps_insert_own"
  on public.mindmaps
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- mindmap_jobs policies
create policy if not exists "mindmap_jobs_select_own"
  on public.mindmap_jobs
  for select
  to authenticated
  using (user_id = auth.uid());

create policy if not exists "mindmap_jobs_insert_own"
  on public.mindmap_jobs
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy if not exists "mindmap_jobs_update_own"
  on public.mindmap_jobs
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
