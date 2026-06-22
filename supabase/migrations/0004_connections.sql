-- Integration connections, synced per-user so they appear across devices.
-- The token is stored here (RLS-protected, encrypted at rest) so a connection
-- set up on one device works on another after sign-in.
create table if not exists public.connections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  name text not null,
  base_url text not null default '',
  auth_method text not null default 'bearer',
  api_key_header text,
  tasks_path text not null default '',
  results_path text,
  map jsonb not null default '{}'::jsonb,
  assignee_filter text,
  extra jsonb,
  token text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted boolean not null default false
);

create index if not exists connections_user_idx on public.connections (user_id);

alter table public.connections enable row level security;
drop policy if exists "connections_owner" on public.connections;
create policy "connections_owner" on public.connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
