alter table public.services
add column if not exists sort_order integer;

insert into public.services (id, title, description, price, duration_minutes, active, sort_order)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'გელ-ლაქი / შილაკი',
    'გელ-ლაქის ან შილაკის წასმა და ფრჩხილის მოწესრიგება.',
    25.00,
    90,
    true,
    1
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'გელ-ლაქი / შილაკის მოხსნა',
    'გელ-ლაქის ან შილაკის უსაფრთხო მოხსნა.',
    5.00,
    15,
    true,
    2
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'ფრჩხილის დაგრძელება',
    'ფრჩხილის დაგრძელება სასურველი ფორმით და სიგრძით.',
    50.00,
    120,
    true,
    3
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'ნუნების მოწესრიგება',
    'ნუნების სუფთა და ლამაზად მოწესრიგება.',
    10.00,
    30,
    true,
    4
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'პედიკიური',
    'ფეხის სრული პედიკიური და მოვლა.',
    40.00,
    90,
    true,
    5
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'ფეხის ფრჩხილების მოწესრიგება',
    'ფეხის ფრჩხილების ფორმის და ზედაპირის მოწესრიგება.',
    25.00,
    60,
    true,
    6
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  duration_minutes = excluded.duration_minutes,
  active = excluded.active,
  sort_order = excluded.sort_order;
