-- Shared start of every local demo scenario (ticket T16): wipes every user-made row and recreates the crew.
-- Keeps listings, galleries, places and enrichment. Run by scripts/seed-demo.mjs inside one transaction. Local only.
truncate public.messages, public.tour_attendees, public.tours, public.stash, public.swipes, public.shortlist,
  public.proposal_members, public.proposals, public.flock_feedback, public.agent_runs, public.agent_usage,
  public.flock_members, public.flocks, public.profiles cascade;
delete from auth.users;

insert into public.profiles (id, username, display_name, avatar_color, bio, budget_max, beds_min, pets, neighborhoods, move_in, habits, discoverable, is_demo) values
  ('00000000-0000-0000-0000-000000000002', 'maya.k',  'Maya Kim',     '#8B5CF6', 'Needs natural light and a laundromat nearby.', 3800, 2, true,  '{"Silver Lake","Echo Park"}',            '2027-01-01', '{"sleep":"early","cleanliness":4,"guests":"sometimes","smoking":false,"noise":"quiet"}', true, true),
  ('00000000-0000-0000-0000-000000000003', 'jordanr', 'Jordan Reyes', '#F97316', 'Close to the Metro, please.',                  4000, 2, false, '{"Koreatown","Hollywood","Silver Lake"}', '2027-01-01', '{"sleep":"late","cleanliness":3,"guests":"often","smoking":false,"noise":"moderate"}', true, true),
  ('00000000-0000-0000-0000-000000000004', 'samlee',  'Sam Lee',      '#0EA5E9', 'Has a dog named Mochi.',                       3500, 2, true,  '{"Los Feliz","Culver City"}',             '2027-01-15', '{"sleep":"flexible","cleanliness":4,"guests":"rarely","smoking":false,"noise":"quiet"}', true, true),
  ('00000000-0000-0000-0000-000000000005', 'priya',   'Priya Shah',   '#E11D48', 'Wants a dishwasher above all else.',           3900, 2, false, '{"Echo Park","Downtown"}',                '2027-01-01', '{"sleep":"early","cleanliness":5,"guests":"sometimes","smoking":false,"noise":"quiet"}', true, true);
