// Roommate compatibility for joining an open flock (design doc §7.4). Pure: no database, no network.
// Compares structured tags only, so the result is repeatable. Reasons are coarse on purpose (privacy):
// they never include anyone's budget, habits or dealbreakers.
import type { Habits, Person } from './types.ts';

// flocks.join_rules: the checks the owner switched on. Dealbreakers are always checked.
export type JoinRules = { budget?: boolean; beds_movein?: boolean; areas?: boolean };

export type OpenFlock = {
  members: Person[]; // active members (full profiles: compat runs on the server)
  rules: JoinRules;
  budgetRange: { min: number; max: number } | null; // per-person share from flocks.filters; null = from members' caps
  bedroomsNeeded: number | null; // null = one per member, so a joiner always adds a room
  moveIn: string | null; // 'YYYY-MM-DD'
  areas: string[]; // [] = anywhere
};

export type Check = { key: 'budget' | 'beds_movein' | 'areas' | 'dealbreakers'; ok: boolean | null; reason: string };
export type Compat = { passes: boolean; checks: Check[]; similarity: number };

const DAY = 86_400_000;
const lower = (xs: string[]) => xs.map((x) => x.trim().toLowerCase());

// shortcut: the tag vocabulary below is a first guess at what the LLM extraction will emit; align it with the
// extraction prompt when that lands.
export function habitTags(h: Habits): string[] {
  const t: string[] = [];
  if (h.smoking) t.push('smoking');
  if (h.pets) t.push('pets');
  if (h.guests === 'often') t.push('overnight-guests');
  if (h.noise === 'loud') t.push('noise');
  if (h.sleep === 'early') t.push('early-sleeper');
  if (h.sleep === 'late') t.push('late-sleeper');
  if (h.cleanliness != null && h.cleanliness <= 2) t.push('messy');
  return t;
}

// 0-1 over the habits both people filled in; 0.5 when they share none.
export function habitSimilarity(a: Habits, b: Habits): number {
  const scores: number[] = [];
  for (const k of ['sleep', 'guests', 'noise', 'smoking', 'pets'] as const)
    if (a[k] != null && b[k] != null) scores.push(a[k] === b[k] ? 1 : 0);
  if (a.cleanliness != null && b.cleanliness != null) scores.push(1 - Math.abs(a.cleanliness - b.cleanliness) / 4);
  return scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0.5;
}

export function compat(person: Person, flock: OpenFlock): Compat {
  const checks: Check[] = [];

  if (flock.rules.budget) {
    const caps = flock.members.map((m) => m.budgetMax).filter((b): b is number => b != null);
    const min = flock.budgetRange?.min ?? (caps.length ? Math.min(...caps) : null);
    const ok = person.budgetMax == null || min == null ? null : person.budgetMax >= min;
    checks.push({ key: 'budget', ok, reason: ok == null ? 'budget unknown' : ok ? 'budgets overlap' : "budgets don't overlap" });
  }

  if (flock.rules.beds_movein) {
    const room = flock.bedroomsNeeded == null || flock.bedroomsNeeded >= flock.members.length + 1;
    const days =
      person.moveIn && flock.moveIn ? Math.abs(Date.parse(person.moveIn) - Date.parse(flock.moveIn)) / DAY : null;
    const timing = days == null ? null : days <= 30;
    const ok = !room || timing === false ? false : timing;
    checks.push({
      key: 'beds_movein',
      ok,
      reason: !room ? 'no bedroom free' : timing == null ? 'move-in date unknown' : timing ? 'move-in dates line up' : 'move-in dates more than 30 days apart',
    });
  }

  if (flock.rules.areas) {
    const want = lower(flock.areas);
    const ok = !want.length || !person.neighborhoods.length || lower(person.neighborhoods).some((n) => want.includes(n));
    checks.push({ key: 'areas', ok, reason: ok ? 'shares an area' : 'no shared areas' });
  }

  // Both directions: the joiner's dealbreakers vs members' habits, and members' dealbreakers vs the joiner's.
  const mine = lower(person.dealbreakerTags);
  const theirTags = flock.members.flatMap((m) => habitTags(m.habits));
  const theirDealbreakers = lower(flock.members.flatMap((m) => m.dealbreakerTags));
  const clash = theirTags.some((t) => mine.includes(t)) || habitTags(person.habits).some((t) => theirDealbreakers.includes(t));
  checks.push({ key: 'dealbreakers', ok: !clash, reason: clash ? 'a habit clashes with a dealbreaker' : 'no dealbreaker clash' });

  const sims = flock.members.map((m) => habitSimilarity(person.habits, m.habits));
  return {
    passes: checks.every((c) => c.ok !== false),
    checks,
    similarity: sims.length ? sims.reduce((s, x) => s + x, 0) / sims.length : 0.5,
  };
}
