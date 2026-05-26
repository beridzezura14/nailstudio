alter table public.bookings
add column if not exists booking_source text;
