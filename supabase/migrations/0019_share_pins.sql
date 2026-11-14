-- Decision: flockmates can see each other's commute pins, in friends and open flocks alike. This replaces the privacy rule in 0018
-- (distances only once two members have a pin), which existed so one person's location could not be worked out from distances.
-- Safe to run twice.

-- You always see and change your own pin (policy "my pin", 0018). Now the people you share an active flock with can also READ it.
drop policy if exists "flockmates see pins" on public.member_pins;
create policy "flockmates see pins" on public.member_pins for select to authenticated
  using (public.shares_flock_with(user_id));

-- Same function as 0018 without the two-pin minimum: farthest and average straight-line miles from each listing to the pins of the
-- flock's active members who set one. Members only.
create or replace function public.flock_pin_distances(p_flock_id uuid, p_listing_ids uuid[])
returns table (listing_id uuid, max_mi double precision, avg_mi double precision, pins int)
language sql stable security definer set search_path = public as $$
  select l.id, max(x.d), avg(x.d), count(*)::int
  from listings l
  join flock_members m on m.flock_id = p_flock_id and m.status = 'active'
  join member_pins p on p.user_id = m.user_id
  cross join lateral (select 3958.8 * 2 * asin(sqrt(least(1,
    sin(radians(l.lat - p.lat) / 2) ^ 2 + cos(radians(p.lat)) * cos(radians(l.lat)) * sin(radians(l.lng - p.lng) / 2) ^ 2)))) as x(d)
  where l.id = any(p_listing_ids) and public.is_flock_member(p_flock_id)
  group by l.id
$$;
revoke execute on function public.flock_pin_distances(uuid, uuid[]) from public, anon;
grant  execute on function public.flock_pin_distances(uuid, uuid[]) to authenticated;
