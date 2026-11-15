-- Scenario "in-flock": Vinnie already belongs to "Our Flock" with the crew, mid-hunt. Sign in as vinnie@flock.test (password flock1234);
-- maya@, jordan@, sam@, priya@ and alex@flock.test work too. Vinnie is the admin of "Our Flock", which is open, and Alex has asked to join it. Local only: these are real auth users with a known password.
insert into public.profiles (id, username, display_name, avatar_color, bio, budget_max, beds_min, pets, neighborhoods, move_in, discoverable, is_demo) values
  ('00000000-0000-0000-0000-000000000001', 'vinnie.park', 'Vinnie Park', '#14B8A6', 'Hunting a 3 bd in Los Angeles with the crew. Move-in Jan 2027.', 4000, 2, true, '{"Silver Lake","Echo Park","Los Feliz"}', '2027-01-01', true, true);

-- Alex is not in the flock: a pending request, because the flock is open.
insert into public.profiles (id, username, display_name, avatar_color, bio, budget_max, beds_min, pets, neighborhoods, move_in, discoverable, is_demo) values
  ('00000000-0000-0000-0000-000000000006', 'alexc', 'Alex Chen', '#10B981', 'Works from home, wants a spare desk nook.', 3600, 2, false, '{"Silver Lake","Koreatown"}', '2027-01-10', true, true);

insert into public.flocks (id, name, created_by, kind, about, looking_for, open_to_join, discoverable, max_size, bedrooms_needed, filters) values
  ('00000000-0000-0000-0000-0000000000a1', 'Our Flock', '00000000-0000-0000-0000-000000000001', 'open',
   'Five friends hunting in Silver Lake, Echo Park and Los Feliz. Move-in January.', 'One more tidy, easygoing roommate.', true, true, 6, 5,
   '{"areas":["Silver Lake","Echo Park","Los Feliz"],"move_in":"2027-01-01"}');

insert into public.flock_members (flock_id, user_id, role, status, joined_via)
select '00000000-0000-0000-0000-0000000000a1', id,
       case when username = 'vinnie.park' then 'admin' else 'member' end,
       case when username = 'alexc' then 'requested' else 'active' end,
       case when username = 'alexc' then 'request' end
from public.profiles;

-- The same 8 mid-priced 2+ bd listings every run (stable order by id).
create temp table demo_pick on commit drop as
  select id, row_number() over (order by id) n from public.listings
  where active and price between 2500 and 4000 and beds >= 2 limit 8;

-- Vinnie has not swiped (empty deck); the others have liked a few and passed on one.
insert into public.swipes (user_id, listing_id, flock_id, direction)
select p.id, d.id, '00000000-0000-0000-0000-0000000000a1', case when d.n = 8 then 'left' else 'right' end
from demo_pick d join public.profiles p on p.username not in ('vinnie.park', 'alexc') where d.n <= 3 or d.n = 8;

insert into public.tours (flock_id, listing_id, starts_at, created_by)
select '00000000-0000-0000-0000-0000000000a1', id, date_trunc('day', now()) + (n || ' days')::interval + interval '18 hours',
       '00000000-0000-0000-0000-000000000002'
from demo_pick where n <= 2;

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
