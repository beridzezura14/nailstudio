create table if not exists public.specialists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.specialist_services (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid not null references public.specialists(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (specialist_id, service_id)
);

alter table public.bookings
add column if not exists specialist_id uuid references public.specialists(id) on delete set null;

create index if not exists bookings_specialist_id_idx
  on public.bookings (specialist_id);

create index if not exists specialist_services_specialist_id_idx
  on public.specialist_services (specialist_id);

create index if not exists specialist_services_service_id_idx
  on public.specialist_services (service_id);

alter table public.specialists enable row level security;
alter table public.specialist_services enable row level security;

drop policy if exists "Allow specialists access" on public.specialists;
create policy "Allow specialists access"
  on public.specialists
  for all
  using (true)
  with check (true);

drop policy if exists "Allow specialist services access" on public.specialist_services;
create policy "Allow specialist services access"
  on public.specialist_services
  for all
  using (true)
  with check (true);

insert into public.specialists (id, name, active, sort_order)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Main Specialist', true, 1)
on conflict (id) do update
set name = excluded.name,
    active = excluded.active,
    sort_order = excluded.sort_order;

insert into public.specialist_services (specialist_id, service_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', services.id
from public.services
on conflict (specialist_id, service_id) do nothing;
