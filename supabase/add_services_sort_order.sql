alter table public.services
add column if not exists sort_order integer;

update public.services
set sort_order = case title
  when 'გელ-ლაქი / შილაკი' then 1
  when 'გელ-ლაქი / შილაკის მოხსნა' then 2
  when 'ფრჩხილის დაგრძელება' then 3
  when 'ნუნების მოწესრიგება' then 4
  when 'პედიკიური' then 5
  when 'ფეხის ფრჩხილების მოწესრიგება' then 6
  else coalesce(sort_order, 99)
end;
