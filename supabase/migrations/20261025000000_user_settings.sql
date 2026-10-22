-- Per-user defaults: the base URL new rooms start with, the theme the app
-- opens in, and exemplar tickets showing what each estimate looks like.
alter table public."user"
    add column if not exists settings jsonb not null default '{}'::jsonb;
