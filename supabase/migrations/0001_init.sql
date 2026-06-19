-- FocusFlow initial schema: categories + time_entries, per-user, with RLS.
-- Soft-delete (deleted flag) + updated_at enable safe multi-device sync.

create table if not exists public.categories (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  icon text not null,
  is_default boolean not null default false,
  archived boolean not null default false,
  source text not null default 'local',
  external_id text,
  sort_order integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted boolean not null default false
);

create table if not exists public.time_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid,
  task_title text not null,
  note text,
  started_at bigint not null,
  ended_at bigint not null,
  duration_ms bigint not null,
  source text not null default 'local',
  color text not null,
  created_at bigint not null,
  updated_at bigint not null,
  deleted boolean not null default false
);

create index if not exists time_entries_user_started_idx
  on public.time_entries (user_id, started_at desc);
create index if not exists categories_user_idx
  on public.categories (user_id);

-- Row-Level Security: a user can only ever see and write their own rows.
alter table public.categories enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "categories_owner" on public.categories;
create policy "categories_owner" on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "time_entries_owner" on public.time_entries;
create policy "time_entries_owner" on public.time_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
