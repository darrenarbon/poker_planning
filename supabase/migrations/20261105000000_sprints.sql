-- Sprint capacity planning. A sprint belongs to a team (not to a planning
-- room: rooms are not aligned to sprints). Closed sprints record what was
-- planned and what was actually completed, which gives the team's velocity;
-- planned ones are forecast from that velocity and the team's leave.

-- 1. what each person does in a team, to help choose who goes into a sprint
alter table public.team_member
    add column if not exists job_title text check (job_title in (
        'developer',
        'lead_developer',
        'product_manager',
        'business_analyst',
        'qa_engineer',
        'engineering_manager',
        'scrum_master',
        'designer',
        'principal_developer',
        'other'
    ));

-- 2. sprints
create table if not exists public.sprint (
    sprint_id bigint generated always as identity primary key,
    team_id bigint not null references public.team (team_id) on delete cascade,
    name text not null,
    start_date date not null,
    end_date date not null,
    status text not null default 'planned'
        check (status in ('planned', 'active', 'closed')),
    -- held back from the forecast for bugs, support and surprises
    buffer_percent numeric not null default 0
        check (buffer_percent >= 0 and buffer_percent <= 100),
    -- unfinished work rolled in from the previous sprint (remaining points only)
    carried_over_points numeric not null default 0 check (carried_over_points >= 0),
    carried_over_tickets integer not null default 0 check (carried_over_tickets >= 0),
    -- everything committed to the sprint, carried-over work included
    planned_points numeric check (planned_points >= 0),
    completed_points numeric check (completed_points >= 0),
    -- working days available across the team, fixed when the sprint closes so
    -- later leave changes do not rewrite history
    available_person_days numeric check (available_person_days >= 0),
    created_by bigint references public."user" (user_id) on delete set null,
    created_at timestamptz not null default now(),
    closed_at timestamptz,
    check (end_date >= start_date)
);

create index if not exists sprint_team_idx
    on public.sprint (team_id, start_date);

-- at most one active sprint per team
create unique index if not exists sprint_one_active_idx
    on public.sprint (team_id)
    where status = 'active';

-- 3. who is in each sprint
create table if not exists public.sprint_member (
    sprint_id bigint not null references public.sprint (sprint_id) on delete cascade,
    user_id bigint not null references public."user" (user_id) on delete cascade,
    primary key (sprint_id, user_id)
);

create index if not exists sprint_member_user_idx
    on public.sprint_member (user_id);
