drop policy if exists "Allow booking cancellation" on public.bookings;

create policy "Allow booking cancellation"
  on public.bookings
  for delete
  using (true);
