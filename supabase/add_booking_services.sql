create table if not exists public.booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  unique (booking_id, service_id)
);

create index if not exists booking_services_booking_id_idx
  on public.booking_services (booking_id);

create index if not exists booking_services_service_id_idx
  on public.booking_services (service_id);

alter table public.booking_services enable row level security;

drop policy if exists "Allow booking services access" on public.booking_services;

create policy "Allow booking services access"
  on public.booking_services
  for all
  using (true)
  with check (true);
