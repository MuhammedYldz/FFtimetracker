-- First-class user tasks (work items time is tracked against).
create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  note text,
  category_id text,
  color text not null,
  archived boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null,
  deleted boolean not null default false
);

create index if not exists tasks_user_idx on public.tasks (user_id);

alter table public.tasks enable row level security;
drop policy if exists "tasks_owner" on public.tasks;
create policy "tasks_owner" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Link time entries to a task.
alter table public.time_entries add column if not exists task_id text;
