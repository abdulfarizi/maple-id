-- M-ID · "Seller" badge (run once in the Supabase SQL editor, after supabase_badges_music.sql).
-- Adds one more owner-only badge column. Everyone can see it; only the owner account can change it.
alter table public.profile_badges add column if not exists seller boolean not null default false;
