-- "Open to join" is a request flow (Figma 05, 00h, 00j): an open flock is listed in Find a flock, people send a request,
-- and an admin approves it. Nobody joins an open flock without approval any more.
-- 1. join_flock: a request, or 'mismatch' when the person clashes with the flock's rules (they cannot send one).
-- 2. set_flock_open: the admin's switch on the Flock screen. Open = shown in Find a flock + takes requests.
-- 3. answer_join_request: the admin approves or declines a request.

create or replace function public.join_flock(p_flock_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); f flocks; m flock_members; p profiles; n int;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into f from flocks where id = p_flock_id for update;
  if not found then raise exception 'no such flock' using errcode = 'P0002'; end if;
  select * into m from flock_members where flock_id = f.id and user_id = me;
  if found and m.status = 'active' then return 'already_member'; end if;
  select count(*) into n from flock_members where flock_id = f.id and status = 'active';

  if found and m.status = 'invited' then                            -- accepting an invite
    if f.max_size is not null and n >= f.max_size then return 'full'; end if;
    update flock_members set status = 'active', joined_via = 'invite' where flock_id = f.id and user_id = me;
    return 'joined';
  end if;

  if not f.open_to_join then return 'closed'; end if;
  if f.max_size is not null and n >= f.max_size then return 'full'; end if;
  select * into p from profiles where id = me;
  if not found then raise exception 'create a profile first' using errcode = 'P0002'; end if;
  if not public.flock_rules_ok(f, p) then return 'mismatch'; end if;

  insert into flock_members (flock_id, user_id, status, joined_via) values (f.id, me, 'requested', 'request')
    on conflict (flock_id, user_id) do update set status = 'requested', joined_via = 'request';
  return 'requested';
end $$;

create function public.set_flock_open(p_flock_id uuid, p_open boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if not exists (select 1 from flock_members where flock_id = p_flock_id and user_id = auth.uid() and status = 'active' and role = 'admin') then
    raise exception 'only an admin can do this' using errcode = '42501';
  end if;
  update flocks set kind = case when p_open then 'open' else kind end, open_to_join = p_open, discoverable = p_open where id = p_flock_id;
end $$;

-- Returns 'approved', 'declined', 'full' or 'no_request'.
create function public.answer_join_request(p_flock_id uuid, p_user_id uuid, p_approve boolean) returns text
language plpgsql security definer set search_path = public as $$
declare f flocks; n int;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if not exists (select 1 from flock_members where flock_id = p_flock_id and user_id = auth.uid() and status = 'active' and role = 'admin') then
    raise exception 'only an admin can do this' using errcode = '42501';
  end if;
  select * into f from flocks where id = p_flock_id for update;
  if not exists (select 1 from flock_members where flock_id = p_flock_id and user_id = p_user_id and status = 'requested') then return 'no_request'; end if;
  if not p_approve then
    update flock_members set status = 'declined' where flock_id = p_flock_id and user_id = p_user_id;
    return 'declined';
  end if;
  select count(*) into n from flock_members where flock_id = p_flock_id and status = 'active';
  if f.max_size is not null and n >= f.max_size then return 'full'; end if;
  update flock_members set status = 'active' where flock_id = p_flock_id and user_id = p_user_id;
  return 'approved';
end $$;

revoke execute on function public.set_flock_open(uuid, boolean) from public, anon;
revoke execute on function public.answer_join_request(uuid, uuid, boolean) from public, anon;
grant  execute on function public.set_flock_open(uuid, boolean) to authenticated;
grant  execute on function public.answer_join_request(uuid, uuid, boolean) to authenticated;
