drop policy if exists "Allow booking admin changes" on public.bookings;

create policy "Allow booking admin changes"
  on public.bookings
  for all
  using (true)
  with check (true);
