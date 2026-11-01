-- Local test data, loaded by `pnpm db:reset` after the migrations.
-- Log in to the app, then join the "demo-room" room to start voting.

insert into public."user" (auth0_sub, email, given_name, family_name, nickname)
values ('seed|facilitator', 'facilitator@example.com', 'Demo', 'Facilitator', 'demo');

insert into public.room (room_name, admin_id, friendly_name, ticket_base_url)
select 'demo-room', user_id, 'Demo room', 'https://example.atlassian.net/browse'
from public."user"
where auth0_sub = 'seed|facilitator';

insert into public.ticket (room_id, ticket_number, sort_order)
select room_id, ticket_number, position
from public.room
cross join (
    values ('DEMO-1', 0), ('DEMO-2', 1), ('DEMO-3', 2)
) as tickets (ticket_number, position)
where room_name = 'demo-room';
