-- Create / find / leave flocks (ticket T10).
-- 1. flock_rules_ok now mirrors lib/match/compat.ts (T7), so "% match" in Find a flock and the join result agree.
--    Unknown answers still fail here (they become a request, not an auto-join); compat() shows them as "unknown".
--    Dealbreaker tags are not checked in SQL yet: nothing fills them until the LLM tag extraction lands.
-- 2. leave_flock: a member leaves; the others see "Continue as a smaller flock?".

create or replace function public.flock_rules_ok(f public.flocks, p public.profiles) returns boolean
language sql stable security definer set search_path = public as $$
  with members as (
    select pr.budget_max from flock_members m join profiles pr on pr.id = m.user_id
    where m.flock_id = f.id and m.status = 'active'
  )
  select
    -- budget: their per-person cap reaches the flock's range (or the lowest member cap)
    (coalesce(f.join_rules ->> 'budget', 'false') <> 'true'
       or (p.budget_max is not null and p.budget_max >= coalesce(
             (f.filters ->> 'budget_min')::int, (select min(budget_max) from members), 0)))
    -- bedrooms and move-in: a free room, and move-in within 30 days of the flock's
    and (coalesce(f.join_rules ->> 'beds_movein', 'false') <> 'true'
       or ((f.bedrooms_needed is null or f.bedrooms_needed >= (select count(*) from members) + 1)
           and p.move_in is not null
           and abs(p.move_in - coalesce((f.filters ->> 'move_in')::date, p.move_in)) <= 30))
    -- areas: at least one in common; a flock with no areas takes anyone
    and (coalesce(f.join_rules ->> 'areas', 'false') <> 'true'
       or jsonb_array_length(coalesce(f.filters -> 'areas', '[]')) = 0
       or exists (select 1 from jsonb_array_elements_text(f.filters -> 'areas') a, unnest(coalesce(p.neighborhoods, '{}')) n
                  where lower(btrim(a)) = lower(btrim(n))))
$$;

create function public.leave_flock(p_flock_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  update flock_members set status = 'left' where flock_id = p_flock_id and user_id = auth.uid() and status = 'active';
end $$;

revoke execute on function public.leave_flock(uuid) from public, anon;
grant  execute on function public.leave_flock(uuid) to authenticated;
