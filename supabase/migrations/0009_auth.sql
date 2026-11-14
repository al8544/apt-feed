-- Real accounts (docs/DESIGN.md §10, ticket T9).
-- 1. Every new auth user gets a profiles row (profiles.id = auth.users.id), named from the sign-up form.
-- 2. join_by_invite: an invite link carries the flock id; opening it while signed in adds you to that flock.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := coalesce(nullif(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9._]', '', 'g'), ''), 'bird');
begin
  insert into profiles (id, username, display_name, is_demo)
  values (
    new.id,
    base || '-' || left(replace(new.id::text, '-', ''), 4),          -- unique without a retry loop
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), base),
    false
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- shortcut: anyone holding the link (an unguessable flock id) can join a friends flock; switch to per-person
-- invite tokens when the invites table lands (00f "Invite friends").
-- Returns 'joined', 'already_member' or 'full'.
create function public.join_by_invite(p_flock_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); f flocks; n int;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into f from flocks where id = p_flock_id for update;     -- same lock as join_flock, so the last seat can't go twice
  if not found then raise exception 'no such flock' using errcode = 'P0002'; end if;
  if exists (select 1 from flock_members where flock_id = f.id and user_id = me and status = 'active') then
    return 'already_member';
  end if;
  select count(*) into n from flock_members where flock_id = f.id and status = 'active';
  if f.max_size is not null and n >= f.max_size then return 'full'; end if;
  insert into flock_members (flock_id, user_id, status, joined_via) values (f.id, me, 'active', 'invite')
    on conflict (flock_id, user_id) do update set status = 'active', joined_via = 'invite';
  return 'joined';
end $$;

revoke execute on function public.join_by_invite(uuid) from public, anon;
grant  execute on function public.join_by_invite(uuid) to authenticated;
