-- Run this after creating your Supabase Auth admin user.
-- It keeps public booking available, but blocks anonymous admin changes.

alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_services enable row level security;
alter table public.specialists enable row level security;
alter table public.specialist_services enable row level security;

drop policy if exists "Allow booking admin changes" on public.bookings;
drop policy if exists "Allow booking cancellation" on public.bookings;
drop policy if exists "Public can read bookings for availability" on public.bookings;
drop policy if exists "Public can create bookings" on public.bookings;
drop policy if exists "Authenticated admins can manage bookings" on public.bookings;

create policy "Public can read bookings for availability"
  on public.bookings
  for select
  using (true);

create policy "Public can create bookings"
  on public.bookings
  for insert
  with check (true);

create policy "Authenticated admins can manage bookings"
  on public.bookings
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Allow booking services access" on public.booking_services;
drop policy if exists "Public can read booking services" on public.booking_services;
drop policy if exists "Public can create booking services" on public.booking_services;
drop policy if exists "Authenticated admins can manage booking services" on public.booking_services;

create policy "Public can read booking services"
  on public.booking_services
  for select
  using (true);

create policy "Public can create booking services"
  on public.booking_services
  for insert
  with check (true);

create policy "Authenticated admins can manage booking services"
  on public.booking_services
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Allow services access" on public.services;
drop policy if exists "Public can read active services" on public.services;
drop policy if exists "Authenticated admins can manage services" on public.services;

create policy "Public can read active services"
  on public.services
  for select
  using (active = true or auth.role() = 'authenticated');

create policy "Authenticated admins can manage services"
  on public.services
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Allow specialists access" on public.specialists;
drop policy if exists "Public can read active specialists" on public.specialists;
drop policy if exists "Authenticated admins can manage specialists" on public.specialists;

create policy "Public can read active specialists"
  on public.specialists
  for select
  using (active = true or auth.role() = 'authenticated');

create policy "Authenticated admins can manage specialists"
  on public.specialists
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Allow specialist services access" on public.specialist_services;
drop policy if exists "Public can read specialist services" on public.specialist_services;
drop policy if exists "Authenticated admins can manage specialist services" on public.specialist_services;

create policy "Public can read specialist services"
  on public.specialist_services
  for select
  using (true);

create policy "Authenticated admins can manage specialist services"
  on public.specialist_services
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
