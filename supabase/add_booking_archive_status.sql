alter table public.bookings
add column if not exists status text not null default 'scheduled';

alter table public.bookings
add column if not exists completed_at timestamptz;

alter table public.bookings
add column if not exists archived_at timestamptz;

update public.bookings
set status = 'scheduled'
where status is null;
