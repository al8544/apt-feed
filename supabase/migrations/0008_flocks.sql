-- Flock data model (docs/DESIGN.md §5.3, §7.4, §9; ticket T6): flocks of any size >= 2, membership with a status,
-- decisions scoped to a flock, privacy view, and join_flock / create_flock.
--
-- Renames (so the app code changes with it, see lib/api.ts):
--   groups -> flocks, group_members -> flock_members, group_id -> flock_id (flock_members, tours),
--   view group_likes -> flock_votes, functions is_group_member / shares_group_with / tour_group -> is_flock_member / shares_flock_with / tour_flock.
-- Anything on another branch still using the group_* names breaks until it adopts the new ones.

drop view public.group_likes;

alter table public.groups        rename to flocks;
alter table public.group_members rename to flock_members;
alter table public.flock_members rename column group_id to flock_id;
alter table public.tours         rename column group_id to flock_id;
alter index public.tours_group_starts_idx rename to tours_flock_starts_idx;

-- ---------- profiles: matching fields and privacy ----------
alter table public.profiles
  add column about            text,                       -- "About you" (open flocks): free text, for humans
  add column habits           jsonb   not null default '{}',   -- structured: sleep, cleanliness 1-5, guests, smoking, noise
  add column dealbreakers_text text,
  add column dealbreaker_tags text[]  not null default '{}',   -- structured tags that code compares (§7.4)
  add column discoverable     boolean not null default false,  -- may appear in matching / Find a Flock
  add column is_demo          boolean not null default false;  -- seeded fictional profile (no auth user)
update public.profiles set is_demo = true;   -- every profile that exists today is a seeded demo person

-- What strangers may see: discoverable people only, and never budget, habits or dealbreakers.
-- Runs with the view owner's rights on purpose (a stranger cannot read profiles); the column list and the WHERE are the whole defense.
create view public.public_profiles as
select id, username, display_name, avatar_color, about from public.profiles where discoverable;
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ---------- flocks ----------
alter table public.flocks
  add column kind            text    not null default 'friends' check (kind in ('friends', 'open')),
  add column origin          text    not null default 'invited' check (origin in ('invited', 'open', 'agent_proposed')),
  add column about           text,
  add column looking_for     text,
  add column open_to_join    boolean not null default false,
  add column discoverable    boolean not null default false,   -- shown in Find a Flock
  add column join_rules      jsonb   not null default '{}',    -- {budget:true, beds_movein:true, areas:true}
  add column max_size        int check (max_size is null or max_size >= 2),   -- null = no cap
  add column bedrooms_needed int,                               -- null = one bedroom per active member
  add column filters         jsonb   not null default '{}',    -- {budget_min, beds, move_in, areas[]}
  add column created_at      timestamptz not null default now();

-- ---------- flock_members: a status instead of "is a row" ----------
alter table public.flock_members
  add column status     text not null default 'active' check (status in ('invited', 'requested', 'active', 'declined', 'left')),
  add column joined_via text check (joined_via in ('invite', 'auto_join', 'request', 'agent')),
  add column created_at timestamptz not null default now();
update public.flock_members set joined_via = 'invite';
create index flock_members_user_idx on public.flock_members (user_id, status);

-- ---------- swipes: a vote belongs to a flock ----------
alter table public.swipes add column flock_id uuid references public.flocks on delete cascade, add column reason text;
update public.swipes s set flock_id = (
  select m.flock_id from public.flock_members m where m.user_id = s.user_id order by m.flock_id limit 1);
do $$ begin
  if exists (select 1 from public.swipes where flock_id is null) then
    raise exception 'swipes exist for people who are in no flock; give them a flock or delete those swipes, then re-run';
  end if;
end $$;
alter table public.swipes alter column flock_id set not null;
alter table public.swipes drop constraint swipes_pkey;
alter table public.swipes add primary key (user_id, listing_id, flock_id);   -- the deck's "seen" state is per flock
create index swipes_flock_idx on public.swipes (flock_id, listing_id);

-- Votes per listing for a flock (replaces group_likes; likes / liked_by kept so lib/api.ts reads them unchanged).
create view public.flock_votes with (security_invoker = true) as
select s.flock_id, s.listing_id,
       count(*) filter (where s.direction = 'right')::int as up,
       count(*) filter (where s.direction = 'left')::int  as down,
       count(*) filter (where s.direction = 'right')::int as likes,
       coalesce(array_agg(s.user_id) filter (where s.direction = 'right'), '{}') as liked_by
from public.swipes s
join public.flock_members m on m.flock_id = s.flock_id and m.user_id = s.user_id and m.status = 'active'
group by s.flock_id, s.listing_id;

-- ---------- RLS helpers (same parameter names so the policies that use them keep working) ----------
alter function public.is_group_member(uuid)   rename to is_flock_member;
alter function public.shares_group_with(uuid) rename to shares_flock_with;
alter function public.tour_group(uuid)        rename to tour_flock;

create or replace function public.is_flock_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from flock_members where flock_id = gid and user_id = auth.uid() and status = 'active')
$$;
create or replace function public.shares_flock_with(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from flock_members a join flock_members b on a.flock_id = b.flock_id
    where a.user_id = auth.uid() and a.status = 'active' and b.user_id = uid and b.status = 'active'
  )
$$;
create or replace function public.tour_flock(tid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select flock_id from tours where id = tid
$$;

-- ---------- policies that change ----------
alter policy "members read their groups"    on public.flocks        rename to "members read their flocks";
alter policy "members read the member list" on public.flock_members using (public.is_flock_member(flock_id));
-- You also see your own invite / request rows, so you can answer them.
create policy "see your own membership rows" on public.flock_members for select to authenticated using (user_id = auth.uid());

drop policy "read own and group mates swipes" on public.swipes;
drop policy "write own swipes"                on public.swipes;
create policy "read own and flock mates swipes" on public.swipes for select to authenticated
  using (user_id = auth.uid() or public.is_flock_member(flock_id));
create policy "vote in your flocks" on public.swipes for insert to authenticated
  with check (user_id = auth.uid() and public.is_flock_member(flock_id));
-- "change own swipes" and "delete own swipes" stay as they were (own rows only).

-- ---------- proposals, feedback, agent runs (tables and read policies; behavior comes with T11 and T12 to T13) ----------
create table public.proposals (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid references public.profiles on delete set null,
  suggested_name text,
  status         text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  expires_at     timestamptz not null default now() + interval '48 hours',
  flock_id       uuid references public.flocks on delete set null   -- set when it becomes a flock
);
create table public.proposal_members (
  proposal_id uuid not null references public.proposals on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  response    text not null default 'pending' check (response in ('pending', 'accepted', 'declined')),
  primary key (proposal_id, user_id)
);
create table public.flock_feedback (        -- rejections and reasons the agent learns from (§8.7)
  id         uuid primary key default gen_random_uuid(),
  flock_id   uuid not null references public.flocks on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  listing_id uuid references public.listings on delete cascade,
  reason     text,
  created_at timestamptz not null default now()
);
create table public.agent_runs (            -- audit trail: what the agent did and why
  id             uuid primary key default gen_random_uuid(),
  flock_id       uuid references public.flocks on delete cascade,
  user_id        uuid references public.profiles on delete set null,
  request        text,
  steps          jsonb,
  result_summary text,
  created_at     timestamptz not null default now()
);

alter table public.proposals        enable row level security;
alter table public.proposal_members enable row level security;
alter table public.flock_feedback   enable row level security;
alter table public.agent_runs       enable row level security;

create function public.in_proposal(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from proposal_members where proposal_id = pid and user_id = auth.uid())
$$;
create policy "see proposals you are in" on public.proposals for select to authenticated
  using (created_by = auth.uid() or public.in_proposal(id));
create policy "see who is in your proposals" on public.proposal_members for select to authenticated
  using (user_id = auth.uid() or public.in_proposal(proposal_id));
create policy "members read feedback"   on public.flock_feedback for select to authenticated using (public.is_flock_member(flock_id));
create policy "members give feedback"   on public.flock_feedback for insert to authenticated
  with check (user_id = auth.uid() and public.is_flock_member(flock_id));
create policy "members read agent runs" on public.agent_runs for select to authenticated using (public.is_flock_member(flock_id));
-- No other client writes: proposals and agent runs are written by the server (service role) and security-definer functions.

-- ---------- create_flock: the flock and its first member in one transaction ----------
create function public.create_flock(
  p_name text, p_kind text default 'friends', p_about text default null, p_looking_for text default null,
  p_open_to_join boolean default false, p_join_rules jsonb default '{}', p_max_size int default null,
  p_bedrooms_needed int default null, p_filters jsonb default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); fid uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'a flock needs a name' using errcode = '22023'; end if;
  if p_kind not in ('friends', 'open') then raise exception 'kind must be friends or open' using errcode = '22023'; end if;
  if p_max_size is not null and p_max_size < 2 then raise exception 'a flock has at least 2 people' using errcode = '22023'; end if;
  insert into flocks (name, kind, origin, about, looking_for, open_to_join, discoverable, join_rules, max_size, bedrooms_needed, filters, created_by)
  values (btrim(p_name), p_kind, case p_kind when 'open' then 'open' else 'invited' end, p_about, p_looking_for,
          p_open_to_join and p_kind = 'open', p_kind = 'open', coalesce(p_join_rules, '{}'), p_max_size, p_bedrooms_needed, coalesce(p_filters, '{}'), me)
  returning id into fid;
  insert into flock_members (flock_id, user_id, role, status, joined_via) values (fid, me, 'admin', 'active', 'invite');
  return fid;
end $$;

-- ---------- join_flock: one transaction that locks the flock, applies the rules, enforces max_size ----------
-- Basic rule checks only: the real compat() lives in code (T7) and replaces flock_rules_ok.
create function public.flock_rules_ok(f public.flocks, p public.profiles) returns boolean
language sql stable as $$
  select
    (coalesce(f.join_rules ->> 'budget', 'false') <> 'true'
       or (p.budget_max is not null and p.budget_max >= coalesce((f.filters ->> 'budget_min')::int, 0)))
    and (coalesce(f.join_rules ->> 'beds_movein', 'false') <> 'true'
       or (p.beds_min is not null and p.beds_min >= coalesce((f.filters ->> 'beds')::int, 0)
           and p.move_in is not null and abs(p.move_in - coalesce((f.filters ->> 'move_in')::date, p.move_in)) <= 30))
    and (coalesce(f.join_rules ->> 'areas', 'false') <> 'true'
       or (p.neighborhoods is not null
           and p.neighborhoods && coalesce(array(select jsonb_array_elements_text(f.filters -> 'areas')), '{}')))
$$;

-- Returns 'joined', 'requested', 'full', 'closed' or 'already_member'.
create function public.join_flock(p_flock_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); f flocks; m flock_members; p profiles; n int;
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into f from flocks where id = p_flock_id for update;     -- two joiners queue here, so they cannot both take the last seat
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

  if public.flock_rules_ok(f, p) then
    insert into flock_members (flock_id, user_id, status, joined_via) values (f.id, me, 'active', 'auto_join')
      on conflict (flock_id, user_id) do update set status = 'active', joined_via = 'auto_join';
    return 'joined';
  end if;
  insert into flock_members (flock_id, user_id, status, joined_via) values (f.id, me, 'requested', 'request')
    on conflict (flock_id, user_id) do update set status = 'requested', joined_via = 'request';
  return 'requested';
end $$;

revoke execute on function public.create_flock(text, text, text, text, boolean, jsonb, int, int, jsonb) from public, anon;
revoke execute on function public.join_flock(uuid) from public, anon;
grant  execute on function public.create_flock(text, text, text, text, boolean, jsonb, int, int, jsonb) to authenticated;
grant  execute on function public.join_flock(uuid) to authenticated;
