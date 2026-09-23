-- Sketchify cloud backup. Run once in the Supabase SQL editor.
-- Matches src/store/sync.ts: files go to the private "sketches" bucket at
-- <user id>/<artwork id>.<ext>, and one row per artwork goes in public.sketches.

create table if not exists public.sketches (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  path        text not null,
  style       text not null,
  adjustments jsonb not null,
  transform   jsonb not null,
  width       integer not null,
  height      integer not null,
  favourite   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sketches_user_updated on public.sketches (user_id, updated_at desc);

alter table public.sketches enable row level security;

drop policy if exists "own sketches: select" on public.sketches;
drop policy if exists "own sketches: insert" on public.sketches;
drop policy if exists "own sketches: update" on public.sketches;
drop policy if exists "own sketches: delete" on public.sketches;

create policy "own sketches: select" on public.sketches
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own sketches: insert" on public.sketches
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own sketches: update" on public.sketches
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own sketches: delete" on public.sketches
  for delete to authenticated using (user_id = (select auth.uid()));

-- Private bucket: 25 MB covers a 4096px PNG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sketches', 'sketches', false, 26214400, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "own sketch files: select" on storage.objects;
drop policy if exists "own sketch files: insert" on storage.objects;
drop policy if exists "own sketch files: update" on storage.objects;
drop policy if exists "own sketch files: delete" on storage.objects;

-- Each user may only touch files under a folder named after their own id.
create policy "own sketch files: select" on storage.objects
  for select to authenticated
  using (bucket_id = 'sketches' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own sketch files: insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sketches' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own sketch files: update" on storage.objects
  for update to authenticated
  using (bucket_id = 'sketches' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own sketch files: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sketches' and (storage.foldername(name))[1] = (select auth.uid())::text);
