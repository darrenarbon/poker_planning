-- When a room's planning session is happening. Required for new rooms (the
-- API enforces it); existing rooms are given the time of this migration.
alter table public.room
    add column if not exists scheduled_at timestamptz not null default now();

create index if not exists room_scheduled_at_idx on public.room (scheduled_at);
