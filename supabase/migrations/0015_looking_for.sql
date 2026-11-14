-- Find a flock asks three long questions before matching: about you (profiles.about), what you want in roommates and a home
-- (this column) and dealbreakers (profiles.dealbreakers_text). The agent reads them to judge which open flocks fit.
-- Free text for humans and the model only: nothing compares it in code, and public_profiles does not expose it.
alter table public.profiles add column looking_for text;
