-- A private "commute pin" per person (T13 follow-up): where they travel to most, so listings can be sorted and filtered by distance.
-- The pin is the owner's alone. The flock only ever sees DISTANCES, computed inside flock_pin_distances (docs/DESIGN.md §7.4 privacy).
create table public.member_pins (
  user_id    uuid primary key references public.profiles on delete cascade,
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  label      text check (char_length(label) <= 60),
  updated_at timestamptz not null default now()
);
alter table public.member_pins enable row level security;
create policy "my pin" on public.member_pins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Straight-line miles from each listing to the pins of the flock's active members who set one. Only the farthest and the average
-- come out, never a coordinate or whose pin is where, and only once at least two members have a pin. Members only. shortcut: straight-line, not a route; see the commute-time follow-up.
create function public.flock_pin_distances(p_flock_id uuid, p_listing_ids uuid[])
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
  having count(*) >= 2   -- one pin would make the distances reveal that person's location
$$;
revoke execute on function public.flock_pin_distances(uuid, uuid[]) from public, anon;
grant  execute on function public.flock_pin_distances(uuid, uuid[]) to authenticated;
