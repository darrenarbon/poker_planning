-- Facilitators can drag the tickets into the order they want to estimate them.

-- 1. each ticket's position within its room's sprint, lowest first
alter table public.ticket
    add column if not exists sort_order integer not null default 0;

-- 2. keep the order rooms see today: by ticket number within each sprint
update public.ticket t
set sort_order = ordered.position
from (
    select
        ticket_id,
        row_number() over (
            partition by room_id, archived_at
            order by ticket_number
        ) - 1 as position
    from public.ticket
) ordered
where ordered.ticket_id = t.ticket_id;

-- 3. saves a new order for the room's current sprint in one statement;
--    ids not in the room's current sprint are ignored
create or replace function public.reorder_tickets(
    p_room_id bigint,
    p_ticket_ids bigint[]
) returns void
language sql
as $$
    update public.ticket t
    set sort_order = ids.position - 1
    from unnest(p_ticket_ids) with ordinality as ids (ticket_id, position)
    where t.ticket_id = ids.ticket_id
      and t.room_id = p_room_id
      and t.archived_at is null;
$$;
