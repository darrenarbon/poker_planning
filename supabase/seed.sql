-- Local test data, loaded by `pnpm db:reset` after the migrations.
--
-- These people have made-up Auth0 subs, so nobody can log in as them: they are
-- there to fill teams, rooms and lists. To see it from the inside, log in to
-- the app yourself, then either open /invite/seed-platform-invite to join the
-- Platform team, or add yourself with SQL, e.g. to make yourself a super admin:
--   update public."user" set is_super_admin = true where email = 'you@example.com';

-- 1. people
insert into public."user" (auth0_sub, email, given_name, family_name, nickname, is_super_admin)
values
    ('seed|facilitator', 'facilitator@example.com', 'Demo', 'Facilitator', 'demo', false),
    ('seed|root', 'root@example.com', 'Sam', 'Root', 'sam.root', true),
    ('seed|alice', 'alice@example.com', 'Alice', 'Anders', 'alice.anders', false),
    ('seed|bob', 'bob@example.com', 'Bob', 'Brooks', 'bob.brooks', false),
    ('seed|carol', 'carol@example.com', 'Carol', 'Chen', 'carol.chen', false),
    ('seed|dave', 'dave@example.com', 'Dave', 'Diaz', 'dave.diaz', false),
    ('seed|erin', 'erin@example.com', 'Erin', 'Evans', 'erin.evans', false),
    -- not in any team
    ('seed|frank', 'frank@example.com', 'Frank', 'Fox', 'frank.fox', false),
    ('seed|grace', 'grace@example.com', 'Grace', 'Green', 'grace.green', false);

-- 2. teams
insert into public.team (name)
values ('Demo team'), ('Platform'), ('Design');

-- 3. who is in them, and as what. Dave is in two teams with different roles.
insert into public.team_member (team_id, user_id, role)
select team.team_id, "user".user_id, membership.role
from (
    values
        ('Demo team', 'seed|facilitator', 'owner'),
        ('Platform', 'seed|alice', 'owner'),
        ('Platform', 'seed|bob', 'admin'),
        ('Platform', 'seed|carol', 'member'),
        ('Platform', 'seed|dave', 'member'),
        ('Design', 'seed|erin', 'owner'),
        ('Design', 'seed|dave', 'admin')
) as membership (team_name, sub, role)
join public.team on team.name = membership.team_name
join public."user" on "user".auth0_sub = membership.sub;

-- 4. invite links: one usable (/invite/seed-platform-invite), one admin
-- invite, one that has expired and one withdrawn, to see each state
insert into public.team_invite (token, team_id, role, created_by, expires_at, revoked_at)
select invite.token, team.team_id, invite.role, "user".user_id,
       now() + invite.lifetime, invite.revoked_at
from (
    values
        ('seed-platform-invite', 'Platform', 'member', 'seed|alice', interval '30 days', null::timestamptz),
        ('seed-platform-admin-invite', 'Platform', 'admin', 'seed|alice', interval '30 days', null),
        ('seed-platform-expired', 'Platform', 'member', 'seed|bob', interval '-1 day', null),
        ('seed-design-revoked', 'Design', 'member', 'seed|erin', interval '30 days', now())
) as invite (token, team_name, role, sub, lifetime, revoked_at)
join public.team on team.name = invite.team_name
join public."user" on "user".auth0_sub = invite.sub;

-- 5. rooms: one with no team, and one for each of two teams
insert into public.room (room_name, admin_id, friendly_name, ticket_base_url, team_id, scheduled_at)
select room.room_name, "user".user_id, room.friendly_name,
       'https://example.atlassian.net/browse', team.team_id,
       date_trunc('hour', now()) + room.starts_in
from (
    values
        ('demo-room', 'Demo room', 'seed|facilitator', null, interval '1 hour'),
        ('platform-sprint', 'Platform sprint planning', 'seed|alice', 'Platform', interval '1 day 2 hours'),
        ('design-crit', 'Design estimates', 'seed|erin', 'Design', interval '-2 days')
) as room (room_name, friendly_name, sub, team_name, starts_in)
join public."user" on "user".auth0_sub = room.sub
left join public.team on team.name = room.team_name;

-- 6. who is in each room; Bob co-facilitates the Platform room. Frank is a
-- guest who joined the Platform room by link, without being in the team.
insert into public.room_users (room_id, user_id)
select room.room_id, "user".user_id
from (
    values
        ('demo-room', 'seed|facilitator'),
        ('platform-sprint', 'seed|alice'),
        ('platform-sprint', 'seed|bob'),
        ('platform-sprint', 'seed|carol'),
        ('platform-sprint', 'seed|dave'),
        ('platform-sprint', 'seed|frank'),
        ('design-crit', 'seed|erin'),
        ('design-crit', 'seed|dave')
) as membership (room_name, sub)
join public.room on room.room_name = membership.room_name
join public."user" on "user".auth0_sub = membership.sub;

insert into public.room_admin (room_id, user_id)
select room.room_id, "user".user_id
from public.room, public."user"
where room.room_name = 'platform-sprint' and "user".auth0_sub = 'seed|bob';

-- 7. tickets
insert into public.ticket (room_id, ticket_number, sort_order)
select room.room_id, tickets.ticket_number, tickets.position
from public.room
join (
    values
        ('demo-room', 'DEMO-1', 0),
        ('demo-room', 'DEMO-2', 1),
        ('demo-room', 'DEMO-3', 2),
        ('platform-sprint', 'PLAT-101', 0),
        ('platform-sprint', 'PLAT-102', 1),
        ('platform-sprint', 'PLAT-103', 2),
        ('design-crit', 'DES-11', 0),
        ('design-crit', 'DES-12', 1)
) as tickets (room_name, ticket_number, position)
    on tickets.room_name = room.room_name;
