-- Row-level security on every table (docs/DESIGN.md §5.4): a person sees a group's rows only if they are in
-- that group, and private rows (stash, messages, swipes) only if they are theirs. The anon key, which is
-- public in the browser bundle, gets listings and nothing else.
--
-- NOTE: the app does not sign anyone in yet (CURRENT_USER_ID comes from localStorage), so right after this
-- migration every signed-out query returns nothing. Until sign-in lands (ticket T9), demos that still run
-- on the anon key also apply supabase/dev-open-access.sql. See README "Database".

-- ---------- Helpers (security definer: they read group_members without re-triggering its own policy) ----------
create function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid())
$$;

create function public.shares_group_with(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = uid
  )
$$;

create function public.tour_group(tid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from tours where id = tid
$$;

alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.listings       enable row level security;
alter table public.swipes         enable row level security;
alter table public.stash          enable row level security;
alter table public.tours          enable row level security;
alter table public.tour_attendees enable row level security;
alter table public.messages       enable row level security;

-- ---------- listings: public property data, read-only for clients ----------
create policy "anyone reads listings" on public.listings for select using (true);

-- ---------- profiles: yours, and the people in your groups (budget, beds, pets are shared inside a flock) ----------
create policy "read own and group mates" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));
create policy "create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- groups and membership: members only. Joining goes through a security-definer function later (T6). ----------
create policy "members read their groups" on public.groups for select to authenticated
  using (public.is_group_member(id));
create policy "members read the member list" on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

-- ---------- swipes: group mates see each other's (that is the flock score); you write only your own ----------
create policy "read own and group mates swipes" on public.swipes for select to authenticated
  using (user_id = auth.uid() or public.shares_group_with(user_id));
create policy "write own swipes" on public.swipes for insert to authenticated with check (user_id = auth.uid());
create policy "change own swipes" on public.swipes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own swipes" on public.swipes for delete to authenticated using (user_id = auth.uid());

-- ---------- stash: private to you ----------
create policy "own stash" on public.stash for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- tours: anyone in the group may see, book, move and cancel (the app lets any member) ----------
create policy "members read tours" on public.tours for select to authenticated
  using (public.is_group_member(group_id));
create policy "members book tours" on public.tours for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());
create policy "members move tours" on public.tours for update to authenticated
  using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
create policy "members cancel tours" on public.tours for delete to authenticated
  using (public.is_group_member(group_id));

create policy "members read attendees" on public.tour_attendees for select to authenticated
  using (public.is_group_member(public.tour_group(tour_id)));
create policy "members add attendees" on public.tour_attendees for insert to authenticated
  with check (public.is_group_member(public.tour_group(tour_id)));
create policy "members remove attendees" on public.tour_attendees for delete to authenticated
  using (public.is_group_member(public.tour_group(tour_id)));  -- covers leaving a tour and cancelling it

-- ---------- messages: only the two people in the conversation; you can only send as yourself ----------
create policy "read your messages" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "send as yourself" on public.messages for insert to authenticated
  with check (sender_id = auth.uid());
