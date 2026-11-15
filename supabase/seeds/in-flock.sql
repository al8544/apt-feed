-- Scenario "in-flock": Vinnie already belongs to "Our Flock" with the crew, mid-hunt. Sign in as vinnie@flock.test (password flock1234);
-- maya@, jordan@, sam@, priya@ and alex@flock.test work too. Vinnie is the admin of "Our Flock", which is open, and Alex has asked to join it. Local only: these are real auth users with a known password.
insert into public.profiles (id, username, display_name, avatar_color, bio, budget_max, beds_min, pets, neighborhoods, move_in, discoverable, is_demo) values
  ('00000000-0000-4000-8000-000000000001', 'vinnie.park', 'Vinnie Park', '#14B8A6', 'Hunting a 3 bd in Los Angeles with the crew. Move-in Jan 2027.', 4000, 2, true, '{"Silver Lake","Echo Park","Los Feliz"}', '2027-01-01', true, true);

-- Alex is not in the flock: a pending request, because the flock is open.
insert into public.profiles (id, username, display_name, avatar_color, bio, budget_max, beds_min, pets, neighborhoods, move_in, discoverable, is_demo) values
  ('00000000-0000-4000-8000-000000000006', 'alexc', 'Alex Chen', '#10B981', 'Works from home, wants a spare desk nook.', 3600, 2, false, '{"Silver Lake","Koreatown"}', '2027-01-10', true, true);

insert into public.flocks (id, name, created_by, kind, about, looking_for, open_to_join, discoverable, max_size, bedrooms_needed, filters) values
  ('00000000-0000-4000-8000-0000000000a1', 'Our Flock', '00000000-0000-4000-8000-000000000001', 'open',
   'Five friends hunting in Silver Lake, Echo Park and Los Feliz. Move-in January.', 'One more tidy, easygoing roommate.', true, true, 6, 5,
   '{"areas":["Silver Lake","Echo Park","Los Feliz"],"move_in":"2027-01-01"}');

insert into public.flock_members (flock_id, user_id, role, status, joined_via)
select '00000000-0000-4000-8000-0000000000a1', id,
       case when username = 'vinnie.park' then 'admin' else 'member' end,
       case when username = 'alexc' then 'requested' else 'active' end,
       case when username = 'alexc' then 'request' end
from public.profiles;

-- The same 8 mid-priced 2+ bd places every run (stable order by id), taken from listing_cards: the app shows one card per community,
-- so picking raw listings would leave most of the likes on places that never appear.
create temp table demo_pick on commit drop as
  select id, row_number() over (order by id) n from public.listing_cards
  where price between 2500 and 4000 and beds >= 2 limit 8;

-- Vinnie has not swiped (empty deck). The other four like places by a falling number (4, 3, 3, 2, 1 likes) so the rankings have an order,
-- and the first of them passes on the last place.
with crew as (select id, row_number() over (order by username) r from public.profiles where username not in ('vinnie.park', 'alexc'))
insert into public.swipes (user_id, listing_id, flock_id, direction)
select c.id, d.id, '00000000-0000-4000-8000-0000000000a1', case when d.n = 8 then 'left' else 'right' end
from demo_pick d join crew c on c.r <= case d.n when 1 then 4 when 2 then 3 when 3 then 3 when 4 then 2 when 5 then 1 when 8 then 1 end
where d.n <= 5 or d.n = 8;

insert into public.tours (flock_id, listing_id, starts_at, created_by)
select '00000000-0000-4000-8000-0000000000a1', id, date_trunc('day', now()) + (n || ' days')::interval + interval '18 hours',
       '00000000-0000-4000-8000-000000000002'
from demo_pick where n <= 3;

-- What each person wrote (shown on their details in the group, and read by the agent).
update public.profiles p set about = v.about, looking_for = v.looking, dealbreakers_text = v.deal
from (values
  ('vinnie.park', 'Product designer, home most days. I cook on Sundays and like a tidy kitchen.', 'A sunny 3 bd near the Metro, with a dog-friendly landlord.', 'No smoking indoors.'),
  ('maya.k',      'Photographer. I need natural light and quiet mornings.',                         'Somewhere walkable with a laundromat close by.',          'Thin walls and no windows.'),
  ('jordanr',     'Musician, out late most weekends. Easygoing about chores if they are fair.',    'Near the Metro or a bus line, a spare room for gear.',     'Strict quiet hours.'),
  ('samlee',      'Nurse on shifts, with a dog named Mochi.',                                       'A ground floor or elevator, and a yard or park nearby.',   'No pets allowed.'),
  ('priya',       'Grad student. I keep a spotless kitchen and study at home.',                    'A dishwasher, good light and a quiet building.',           'No dishwasher and loud neighbors.'),
  ('alexc',       'Software engineer working from home. I cook a lot and keep shared spaces tidy.', 'A quiet flock in Silver Lake or Koreatown, with room for a desk.', 'Smoking indoors and constant parties.')
) as v(username, about, looking, deal)
where p.username = v.username;

-- A few lines in the flock chat so it opens with some history.
insert into public.flock_messages (flock_id, sender_id, body, created_at) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000002', 'Found two places near Silver Lake that might work, check the tour times.', now() - interval '3 hours'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000004', 'Is either one okay with dogs? Mochi comes with me.',                        now() - interval '2 hours 40 minutes'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'Both say pets are fine. I can do Saturday at 6.',                              now() - interval '2 hours'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000005', 'Saturday works. Please check the kitchen has a dishwasher!',                   now() - interval '1 hour');

-- Commute pins (where each person travels to most) so the map and the member details have something to show. Alex has none.
insert into public.member_pins (user_id, lat, lng, label) values
  ('00000000-0000-4000-8000-000000000001', 34.0407, -118.2468, 'Downtown office'),
  ('00000000-0000-4000-8000-000000000002', 34.0736, -118.4004, 'Studio in Beverly Hills'),
  ('00000000-0000-4000-8000-000000000003', 34.0928, -118.3287, 'Hollywood gig'),
  ('00000000-0000-4000-8000-000000000004', 34.0211, -118.3965, 'Culver City dog park'),
  ('00000000-0000-4000-8000-000000000005', 34.0689, -118.4452, 'UCLA');

do $$ begin
  if not exists (select 1 from public.listings) then
    raise warning 'No listings: load the LA data first (docs/LOCAL_DATABASE.md, "Load the LA data"). Swipes and tours were skipped.';
  end if;
end $$;


-- Real accounts for the five demo profiles (the profile rows exist already, so the sign-up trigger does nothing).
-- Token columns are '' on purpose: GoTrue fails to read NULLs there.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                        created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', split_part(display_name, ' ', 1) || '@flock.test',
       crypt('flock1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from public.profiles;
update auth.users set email = lower(email);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
from auth.users;
