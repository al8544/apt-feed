-- Tables and functions the Flock agent needs (docs/DESIGN.md §5.3, §8.4, §9; ticket T12).
-- The agent's tools run as the signed-in caller (a user-scoped client), so every write here goes through row-level security
-- or a security-definer function that checks the caller itself. The service-role key is never used by the agent.

-- ---------- shortlist: the agent's (and members') picks for a flock ----------
-- No stored score: it is computed on read from the votes (§7.3).
create table public.shortlist (
  flock_id     uuid not null references public.flocks on delete cascade,
  listing_id   uuid not null references public.listings on delete cascade,
  explanation  text,
  criteria     jsonb,              -- per-criterion results from lib/match, the explanation is built from them
  status       text not null default 'active' check (status in ('active', 'contested', 'removed')),
  added_by     text not null default 'agent' check (added_by in ('agent', 'member')),
  agent_run_id uuid references public.agent_runs on delete set null,
  created_at   timestamptz not null default now(),
  primary key (flock_id, listing_id)
);
alter table public.shortlist enable row level security;
create policy "members read the shortlist"   on public.shortlist for select to authenticated using (public.is_flock_member(flock_id));
create policy "members add to the shortlist" on public.shortlist for insert to authenticated with check (public.is_flock_member(flock_id));
create policy "members change the shortlist" on public.shortlist for update to authenticated
  using (public.is_flock_member(flock_id)) with check (public.is_flock_member(flock_id));
alter publication supabase_realtime add table public.shortlist;

-- The run log is written by the API route as the caller.
create policy "members log their own runs" on public.agent_runs for insert to authenticated
  with check (user_id = auth.uid() and (flock_id is null or public.is_flock_member(flock_id)));

-- ---------- per-user daily budget for the agent endpoints (each call spends model credits) ----------
create table public.agent_usage (
  user_id uuid not null references public.profiles on delete cascade,
  day     date not null default current_date,
  calls   int  not null default 0,
  primary key (user_id, day)
);
alter table public.agent_usage enable row level security;   -- no policies: only take_agent_call touches it

-- Counts one call for the caller; false once they are over today's limit.
create function public.take_agent_call(p_daily_limit int default 60) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  insert into agent_usage (user_id, day, calls) values (me, current_date, 1)
    on conflict (user_id, day) do update set calls = agent_usage.calls + 1
    returning calls into n;
  return n <= p_daily_limit;
end $$;

-- ---------- invite_to_flock: the only way the agent adds people, and it is the caller who must be allowed to ----------
-- Returns 'invited', 'already_member', 'already_invited', 'full' or 'no_such_user'. Never makes anyone a member: the person accepts with join_flock.
create function public.invite_to_flock(p_flock_id uuid, p_username text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f flocks; target uuid; m flock_members; n int;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into f from flocks where id = p_flock_id for update;
  if not found or not public.is_flock_member(p_flock_id) then raise exception 'not a member of this flock' using errcode = '42501'; end if;
  select id into target from profiles where lower(username) = lower(btrim(p_username));
  if target is null then return 'no_such_user'; end if;
  select * into m from flock_members where flock_id = f.id and user_id = target;
  if found and m.status = 'active' then return 'already_member'; end if;
  if found and m.status = 'invited' then return 'already_invited'; end if;
  select count(*) into n from flock_members where flock_id = f.id and status in ('active', 'invited');
  if f.max_size is not null and n >= f.max_size then return 'full'; end if;
  insert into flock_members (flock_id, user_id, status, joined_via) values (f.id, target, 'invited', 'invite')
    on conflict (flock_id, user_id) do update set status = 'invited', joined_via = 'invite';
  return 'invited';
end $$;

revoke execute on function public.take_agent_call(int) from public, anon;
revoke execute on function public.invite_to_flock(uuid, text) from public, anon;
grant  execute on function public.take_agent_call(int) to authenticated;
grant  execute on function public.invite_to_flock(uuid, text) to authenticated;
