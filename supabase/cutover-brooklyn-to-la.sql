-- MANUAL AND DESTRUCTIVE: the Brooklyn -> LA cutover (ticket T4). Not a migration on purpose, so no
-- `supabase db push` can run it by accident. It deletes ALL swipes, stash, tours, attendees and messages and the
-- Brooklyn seed listings, then rewrites the demo people for LA. Take a backup first and run it on a test database
-- before the real one. Order: apply 0004, ingest LA, apply 0005, then this, then ship the app change.
begin;

delete from public.messages;
delete from public.tour_attendees;
delete from public.tours;
delete from public.stash;
delete from public.swipes;
delete from public.listings where source = 'seed';   -- Brooklyn; LA rows have source = 'costar'

update public.groups set name = 'Our Flock';
update public.profiles p set neighborhoods = v.hoods, bio = v.bio
from (values
  ('vinnie.park', array['Silver Lake','Echo Park','Los Feliz'],  'Hunting a 3 bd in Los Angeles with the crew. Move-in Jan 2027.'),
  ('maya.k',      array['Silver Lake','Echo Park'],              'Needs natural light and a laundromat nearby.'),
  ('jordanr',     array['Koreatown','Hollywood','Silver Lake'],  'Close to the Metro, please.'),
  ('samlee',      array['Los Feliz','Culver City'],              'Has a dog named Mochi.'),
  ('priya',       array['Echo Park','Downtown'],                 'Wants a dishwasher above all else.')
) as v(username, hoods, bio)
where p.username = v.username;

commit;
