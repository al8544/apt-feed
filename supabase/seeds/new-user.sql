-- Scenario "new-user": nobody is signed in and there is no Vinnie. Sign up in the app, then either start a friends flock
-- or join one of three open flocks that "Find a flock" ranks by compatibility. Runs with real sign-in (no demo switcher).
insert into public.profiles (id, username, display_name, avatar_color, bio, budget_max, beds_min, pets, neighborhoods, move_in, habits, discoverable, is_demo) values
  ('00000000-0000-0000-0000-000000000006', 'alexc', 'Alex Chen',  '#10B981', 'Works from home, wants a spare desk nook.', 3600, 2, false, '{"Koreatown","Downtown"}',      '2027-02-01', '{"sleep":"late","cleanliness":3,"guests":"rarely","smoking":false,"noise":"moderate"}', true, true),
  ('00000000-0000-0000-0000-000000000007', 'danao',  'Dana Ortiz', '#F59E0B', 'Two cats, one cat-proof couch.',            3300, 2, true,  '{"Culver City","Los Feliz"}',   '2027-01-15', '{"sleep":"flexible","cleanliness":4,"guests":"sometimes","smoking":false,"noise":"quiet"}', true, true);

insert into public.flocks (id, name, created_by, kind, origin, about, looking_for, open_to_join, discoverable, join_rules, max_size, bedrooms_needed, filters) values
  ('00000000-0000-0000-0000-0000000000c1', 'Silver Lake Squad', '00000000-0000-0000-0000-000000000002', 'open', 'open',
   'Early risers who like quiet evenings.', 'One more roommate for a 3 bd.', true, true,
   '{"budget":true,"beds_movein":true,"areas":true}', 3, 3, '{"budget_min":3500,"move_in":"2027-01-01","areas":["Silver Lake","Echo Park"]}'),
  ('00000000-0000-0000-0000-0000000000c2', 'Koreatown Crew', '00000000-0000-0000-0000-000000000003', 'open', 'open',
   'Night owls near the Metro.', 'Two more for a big place.', true, true,
   '{"budget":true,"areas":true}', 4, 4, '{"budget_min":3000,"areas":["Koreatown","Hollywood","Downtown"]}'),
  ('00000000-0000-0000-0000-0000000000c3', 'Pet Parents Westside', '00000000-0000-0000-0000-000000000004', 'open', 'open',
   'Dogs and cats welcome.', 'Pet-friendly roommates.', true, true,
   '{"areas":true}', 3, 3, '{"areas":["Culver City","Los Feliz"]}');

insert into public.flock_members (flock_id, user_id, role)
values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000002', 'admin'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000005', 'member'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000003', 'admin'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000006', 'member'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000004', 'admin'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000007', 'member');
