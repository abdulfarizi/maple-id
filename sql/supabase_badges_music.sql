-- M-ID · "Music artist" badge (run once, after supabase_badges.sql).
-- Adds one more owner-only badge column. Everyone can see it; only the owner account can change it.
alter table public.profile_badges add column if not exists music_artist boolean not null default false;
