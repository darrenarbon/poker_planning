-- Teams, team roles, invites and a super admin flag. A team groups people who
-- work together; rooms can belong to a team so its members can be added to
-- them. Existing users and rooms are untouched (no team).

-- 1. super admins can see and manage everything, whatever the team
alter table public."user"
    add column if not exists is_super_admin boolean not null default false;

-- 2. teams
create table if not exists public.team (
    team_id bigint generated always as identity primary key,
    name text not null,
    created_at timestamptz not null default now()
);

-- 3. a user can be in many teams, with a different role in each
create table if not exists public.team_member (
    team_id bigint not null references public.team (team_id) on delete cascade,
    user_id bigint not null references public."user" (user_id) on delete cascade,
    role text not null check (role in ('owner', 'admin', 'member')),
    joined_at timestamptz not null default now(),
    primary key (team_id, user_id)
);

create index if not exists team_member_user_idx
    on public.team_member (user_id);

-- exactly one owner per team
create unique index if not exists team_member_one_owner_idx
    on public.team_member (team_id)
    where role = 'owner';

-- 4. invite links: whoever opens one while logged in joins with its role
create table if not exists public.team_invite (
    invite_id bigint generated always as identity primary key,
    token text not null unique,
    team_id bigint not null references public.team (team_id) on delete cascade,
    role text not null default 'member' check (role in ('admin', 'member')),
    created_by bigint references public."user" (user_id) on delete set null,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    revoked_at timestamptz
);

create index if not exists team_invite_team_idx
    on public.team_invite (team_id);

-- 5. rooms can belong to a team; deleting a team keeps its rooms
alter table public.room
    add column if not exists team_id bigint
        references public.team (team_id) on delete set null;

create index if not exists room_team_idx on public.room (team_id);
