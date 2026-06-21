-- Category IDs are app-defined slugs (e.g. "cat-development") as well as UUIDs,
-- so the id column must be text, not uuid. (No-op if already applied.)
alter table public.time_entries alter column category_id type text using category_id::text;
alter table public.categories alter column id type text using id::text;
