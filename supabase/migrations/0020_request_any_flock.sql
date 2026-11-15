-- Anyone can ask to join any open flock, whatever the rules say (Find a flock lists every flock with a match %): a request only goes to the
-- flock's admin, who answers it. The rules still drive the match % and the "why you match" list; they no longer block the request.
-- 'full' and 'closed' still stop it: a full flock cannot take anyone and a closed one is not taking requests.

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

  insert into flock_members (flock_id, user_id, status, joined_via) values (f.id, me, 'requested', 'request')
    on conflict (flock_id, user_id) do update set status = 'requested', joined_via = 'request';
  return 'requested';
end $$;
