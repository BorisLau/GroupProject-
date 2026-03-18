create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.task_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  mindmap_graph jsonb not null,
  selected_file_name text not null default '',
  generation_status text not null default '',
  is_generating boolean not null default false,
  source_mindmap_id uuid references public.mindmaps (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_task_records_user_id_updated_at
  on public.task_records (user_id, updated_at desc);

drop trigger if exists set_task_records_updated_at on public.task_records;

create trigger set_task_records_updated_at
before update on public.task_records
for each row
execute function public.set_updated_at_timestamp();

alter table public.task_records enable row level security;

drop policy if exists "task_records_select_own" on public.task_records;
create policy "task_records_select_own"
  on public.task_records
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "task_records_insert_own" on public.task_records;
create policy "task_records_insert_own"
  on public.task_records
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "task_records_update_own" on public.task_records;
create policy "task_records_update_own"
  on public.task_records
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "task_records_delete_own" on public.task_records;
create policy "task_records_delete_own"
  on public.task_records
  for delete
  to authenticated
  using (user_id = auth.uid());
