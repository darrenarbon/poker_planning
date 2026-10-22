-- Co-facilitators per room, and archiving a sprint's tickets so a room can be
-- reused with the same link.

-- 1. co-facilitators: room.admin_id stays the owner, these share admin rights
create table if not exists public.room_admin (
    room_id bigint not null references public.room (room_id) on delete cascade,
    user_id bigint not null references public."user" (user_id) on delete cascade,
    primary key (room_id, user_id)
);

-- 2. archived tickets are kept, just hidden from the current sprint
alter table public.ticket
    add column if not exists archived_at timestamptz;

create index if not exists ticket_room_active_idx
    on public.ticket (room_id)
    where archived_at is null;
