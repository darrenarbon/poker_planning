-- Upserts into room_users and room_admin conflict on (room_id, user_id), which
-- needs a unique constraint behind it. A database whose tables were created
-- before the migrations (so "create table if not exists" skipped the primary
-- key) fails with 42P10 when a team room adds its members. This is a no-op
-- where the primary key already exists.

delete from public.room_users a
    using public.room_users b
    where a.ctid > b.ctid
      and a.room_id = b.room_id
      and a.user_id = b.user_id;

create unique index if not exists room_users_room_id_user_id_key
    on public.room_users (room_id, user_id);

delete from public.room_admin a
    using public.room_admin b
    where a.ctid > b.ctid
      and a.room_id = b.room_id
      and a.user_id = b.user_id;

create unique index if not exists room_admin_room_id_user_id_key
    on public.room_admin (room_id, user_id);
