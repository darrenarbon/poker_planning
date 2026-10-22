-- Store votes as numbers, persist "votes revealed" per ticket, and let the
-- database delete a ticket's votes along with the ticket in one statement.

-- 1. votes become integers (the card values are 0 = "No Idea", 1, 2, 3, 5, ...)
alter table public.vote
    alter column vote type smallint using vote::smallint;

-- 2. whether the admin has revealed the votes for a ticket
alter table public.ticket
    add column if not exists votes_revealed boolean not null default false;

-- 3. deleting a ticket deletes its votes atomically
do $$
declare
    fk_name text;
begin
    select con.conname into fk_name
    from pg_constraint con
    join pg_attribute att
        on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.contype = 'f'
      and con.conrelid = 'public.vote'::regclass
      and con.confrelid = 'public.ticket'::regclass
      and att.attname = 'ticket_id';

    if fk_name is not null then
        execute format('alter table public.vote drop constraint %I', fk_name);
    end if;
end $$;

alter table public.vote
    add constraint vote_ticket_id_fkey
    foreign key (ticket_id) references public.ticket (ticket_id)
    on delete cascade;
