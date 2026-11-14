-- T11: answering an agent-proposed group. Everyone must accept; the flock is created in the transaction of the last accept;
-- one decline closes the proposal.

-- Returns 'waiting' (others still to answer), 'flock_created' (this was the last accept), 'declined' (the proposal is closed),
-- 'expired', 'closed' (already accepted, declined or expired) or 'already_responded'.
create function public.respond_to_proposal(p_proposal_id uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); p proposals; pm proposal_members; fid uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into p from proposals where id = p_proposal_id for update;   -- answers queue here, so the last accept creates the flock exactly once
  if not found then raise exception 'no such proposal' using errcode = 'P0002'; end if;
  select * into pm from proposal_members where proposal_id = p.id and user_id = me;
  if not found then raise exception 'not invited to this proposal' using errcode = '42501'; end if;
  if p.status <> 'pending' then return 'closed'; end if;
  if p.expires_at <= now() then
    update proposals set status = 'expired' where id = p.id;
    return 'expired';
  end if;
  if pm.response <> 'pending' then return 'already_responded'; end if;

  if not p_accept then
    update proposal_members set response = 'declined' where proposal_id = p.id and user_id = me;
    update proposals set status = 'declined' where id = p.id;
    return 'declined';
  end if;

  update proposal_members set response = 'accepted' where proposal_id = p.id and user_id = me;
  if exists (select 1 from proposal_members where proposal_id = p.id and response <> 'accepted') then return 'waiting'; end if;

  insert into flocks (name, kind, origin, created_by)
  values (coalesce(nullif(btrim(p.suggested_name), ''), 'New flock'), 'friends', 'agent_proposed', p.created_by)
  returning id into fid;
  if p.created_by is not null then   -- whoever asked the agent runs the flock, even if they were not on the invite list
    insert into flock_members (flock_id, user_id, role, status, joined_via) values (fid, p.created_by, 'admin', 'active', 'agent');
  end if;
  insert into flock_members (flock_id, user_id, role, status, joined_via)
    select fid, user_id, 'member', 'active', 'agent' from proposal_members where proposal_id = p.id
    on conflict (flock_id, user_id) do nothing;
  update proposals set status = 'accepted', flock_id = fid where id = p.id;
  return 'flock_created';
end $$;

revoke execute on function public.respond_to_proposal(uuid, boolean) from public, anon;
grant  execute on function public.respond_to_proposal(uuid, boolean) to authenticated;
