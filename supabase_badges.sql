-- M-ID · owner badges (v36-11): a tick for verified people, a crown for special honors.
-- Run once in Supabase → SQL editor (after supabase_forum.sql, which creates forum_is_mod()). Safe to run again.
-- Everyone can SEE badges; only your owner account (the "maple" profile) can give, change or remove them.

create table if not exists public.profile_badges (
  slug       text primary key,
  verified   boolean not null default false,
  crown      boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profile_badges enable row level security;
revoke all on public.profile_badges from anon, authenticated;
grant select on public.profile_badges to anon, authenticated;
grant insert, update, delete on public.profile_badges to authenticated;

drop policy if exists "badges are public" on public.profile_badges;
create policy "badges are public" on public.profile_badges for select to anon, authenticated using (true);

drop policy if exists "owner gives badges" on public.profile_badges;
create policy "owner gives badges" on public.profile_badges for insert to authenticated with check (public.forum_is_mod());

drop policy if exists "owner edits badges" on public.profile_badges;
create policy "owner edits badges" on public.profile_badges for update to authenticated using (public.forum_is_mod()) with check (public.forum_is_mod());

drop policy if exists "owner removes badges" on public.profile_badges;
create policy "owner removes badges" on public.profile_badges for delete to authenticated using (public.forum_is_mod());
