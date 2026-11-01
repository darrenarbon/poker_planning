-- The tables planning poker started with, before the migrations that follow.
-- Production already has these, so every statement is a no-op there; it lets
-- `supabase start` / `supabase db reset` build the whole schema locally.

-- 1. people, keyed by their Auth0 subject
create table if not exists public."user" (
    user_id bigint generated always as identity primary key,
    auth0_sub text not null unique,
    email text,
    given_name text,
    family_name text,
    nickname text,
    picture text
);

-- 2. planning poker rooms; admin_id is the owner
create table if not exists public.room (
    room_id bigint generated always as identity primary key,
    room_name text not null unique,
    admin_id bigint not null references public."user" (user_id),
    friendly_name text,
    ticket_base_url text,
    created_at timestamptz not null default now(),
    hidden boolean not null default false
);

-- 3. who has joined which room, with their own favourite flag
create table if not exists public.room_users (
    room_id bigint not null references public.room (room_id) on delete cascade,
    user_id bigint not null references public."user" (user_id) on delete cascade,
    favourite boolean not null default false,
    last_joined_at timestamptz,
    primary key (room_id, user_id)
);

-- 4. tickets to estimate in a room
create table if not exists public.ticket (
    ticket_id bigint generated always as identity primary key,
    room_id bigint not null references public.room (room_id) on delete cascade,
    ticket_number text not null,
    chosen_estimate integer,
    average_vote numeric,
    standard_deviation numeric
);

-- 5. one vote per person per ticket (made a number by the next migration)
create table if not exists public.vote (
    vote_id bigint generated always as identity primary key,
    ticket_id bigint not null references public.ticket (ticket_id),
    user_id bigint not null references public."user" (user_id) on delete cascade,
    vote text not null,
    unique (ticket_id, user_id)
);
