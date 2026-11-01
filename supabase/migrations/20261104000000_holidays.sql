-- Time off per person: annual leave, sickness, bank holidays and so on. A
-- holiday covers whole days from start_date to end_date (inclusive); day_part
-- says whether each of those days is off in full or just the morning or
-- afternoon. Used to flag people who are away when a planning session is on.
create table if not exists public.holiday (
    holiday_id bigint generated always as identity primary key,
    user_id bigint not null references public."user" (user_id) on delete cascade,
    start_date date not null,
    end_date date not null,
    day_part text not null default 'full' check (day_part in ('full', 'am', 'pm')),
    reason text not null check (reason in (
        'annual_leave',
        'sickness',
        'birthday_leave',
        'bank_holiday',
        'maternity_leave',
        'paternity_leave',
        'parental_leave',
        'compassionate_leave',
        'study_leave',
        'unpaid_leave',
        'jury_service',
        'other'
    )),
    note text,
    -- who entered it, which may be a team owner or super admin on their behalf
    created_by bigint references public."user" (user_id) on delete set null,
    created_at timestamptz not null default now(),
    check (end_date >= start_date)
);

create index if not exists holiday_user_dates_idx
    on public.holiday (user_id, start_date, end_date);
