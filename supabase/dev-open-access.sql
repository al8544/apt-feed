-- DEMO ONLY. Gives the anon key the same free read/write access the project has today, so the app keeps
-- working before sign-in exists (ticket T9). With this applied, anyone with the public anon key can read
-- and change every row: do not apply it to a project with real users. Remove it when auth lands:
--   drop policy "demo open access" on public.<table>;   -- for each table below
do $$
declare t text;
begin
  foreach t in array array['profiles','groups','group_members','listings','swipes','stash','tours','tour_attendees','messages']
  loop
    execute format('drop policy if exists "demo open access" on public.%I', t);
    execute format('create policy "demo open access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
