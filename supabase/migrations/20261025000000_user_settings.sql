-- Per-user defaults: the base URL new rooms start with and the theme the app
-- opens in, plus exemplar tickets showing what each estimate looks like.

-- 1. one row per user who has saved settings; null means "no default"
create table if not exists public.user_settings (
    user_id bigint primary key references public."user" (user_id) on delete cascade,
    default_base_url text,
    default_theme text check (default_theme in ('light', 'dark'))
);

-- 2. example tickets for an estimate, shown in rooms the user owns
create table if not exists public.user_exemplar (
    exemplar_id bigint generated always as identity primary key,
    user_id bigint not null references public."user" (user_id) on delete cascade,
    estimate smallint not null,
    ticket_number text not null
);

create index if not exists user_exemplar_user_idx
    on public.user_exemplar (user_id);
