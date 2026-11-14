-- Scenario "in-flock": Vinnie already belongs to "Our Flock" with the crew, mid-hunt. Runs the demo person switcher (NEXT_PUBLIC_DEMO=1).
insert into public.profiles (id, username, display_name, avatar_color, bio, budget_max, beds_min, pets, neighborhoods, move_in, discoverable, is_demo) values
  ('00000000-0000-0000-0000-000000000001', 'vinnie.park', 'Vinnie Park', '#14B8A6', 'Hunting a 3 bd in Los Angeles with the crew. Move-in Jan 2027.', 4000, 2, true, '{"Silver Lake","Echo Park","Los Feliz"}', '2027-01-01', true, true);

insert into public.flocks (id, name, created_by) values
  ('00000000-0000-0000-0000-0000000000a1', 'Our Flock', '00000000-0000-0000-0000-000000000002');

insert into public.flock_members (flock_id, user_id, role)
select '00000000-0000-0000-0000-0000000000a1', id, case when username = 'maya.k' then 'admin' else 'member' end
from public.profiles;

-- The same 8 mid-priced 2+ bd listings every run (stable order by id).
create temp table demo_pick on commit drop as
  select id, row_number() over (order by id) n from public.listings
  where active and price between 2500 and 4000 and beds >= 2 limit 8;

-- Vinnie has not swiped (empty deck); the others have liked a few and passed on one.
insert into public.swipes (user_id, listing_id, flock_id, direction)
select p.id, d.id, '00000000-0000-0000-0000-0000000000a1', case when d.n = 8 then 'left' else 'right' end
from demo_pick d join public.profiles p on p.username <> 'vinnie.park' where d.n <= 3 or d.n = 8;

insert into public.tours (flock_id, listing_id, starts_at, created_by)
select '00000000-0000-0000-0000-0000000000a1', id, date_trunc('day', now()) + (n || ' days')::interval + interval '18 hours',
       '00000000-0000-0000-0000-000000000002'
from demo_pick where n <= 2;

do $$ begin
  if not exists (select 1 from public.listings) then
    raise warning 'No listings: load the LA data first (docs/LOCAL_DATABASE.md, "Load the LA data"). Swipes and tours were skipped.';
  end if;
end $$;

