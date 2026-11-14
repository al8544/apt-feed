// Open flocks ranked by compatibility with one person (Figma 00i, 00j). Shared by GET /api/flocks/discover and the agent's
// matcher (POST /api/flocks/match), so both look at the same candidates.
// Computed with the service key; only public fields and coarse reasons come out (docs/DESIGN.md §7.4 privacy).
import { adminClient } from '@/lib/server/admin';
import { compat, type JoinRules, type OpenFlock } from '@/lib/match/compat';
import type { Person } from '@/lib/match/types';

type ProfileRow = {
  id: string; username: string; display_name: string; avatar_color: string;
  budget_max: number | null; move_in: string | null; neighborhoods: string[] | null;
  habits: Person['habits'] | null; dealbreaker_tags: string[] | null;
};
type FlockRow = {
  id: string; name: string; about: string | null; looking_for: string | null; max_size: number | null;
  bedrooms_needed: number | null; join_rules: JoinRules | null; created_at: string;
  filters: { budget_min?: number | null; budget_max?: number | null; areas?: string[]; move_in?: string | null } | null;
  flock_members: { user_id: string; status: string }[];
};

const person = (p: ProfileRow): Person => ({
  userId: p.id, budgetMax: p.budget_max, moveIn: p.move_in, neighborhoods: p.neighborhoods ?? [],
  habits: p.habits ?? {}, dealbreakerTags: p.dealbreaker_tags ?? [],
});

// Match % = 70% the share of known rules you pass + 30% habit similarity (lib/match/compat.ts).
const matchPct = (checks: { ok: boolean | null }[], similarity: number) => {
  const known = checks.filter((c) => c.ok !== null);
  const pass = known.length ? known.filter((c) => c.ok).length / known.length : 1;
  return Math.round(70 * pass + 30 * similarity);
};

export type Discovered = {
  id: string; name: string; about: string | null; lookingFor: string | null; createdAt: string;
  members: Pick<ProfileRow, 'id' | 'username' | 'display_name' | 'avatar_color'>[];
  maxSize: number | null; area: string | null; budgetMin: number | null; budgetMax: number | null;
  matchPct: number; passes: boolean; checks: { key: string; ok: boolean | null; reason: string }[];
};

// Best match first. `only` asks for one flock by id (and then keeps it even if you are already in it).
export async function discover(callerId: string, only?: string | null): Promise<{ flocks: Discovered[] } | { error: string; status: number }> {
  let db;
  try {
    db = adminClient();
  } catch (e) {
    return { error: (e as Error).message, status: 500 };
  }

  let q = db
    .from('flocks')
    .select('id, name, about, looking_for, max_size, bedrooms_needed, join_rules, filters, created_at, flock_members(user_id, status)')
    .eq('kind', 'open')
    .eq('open_to_join', true)
    .eq('discoverable', true);
  if (only) q = q.eq('id', only);
  const { data: flocks, error } = await q;
  if (error) return { error: error.message, status: 500 };

  const rows = (flocks ?? []) as FlockRow[];
  const active = (f: FlockRow) => f.flock_members.filter((m) => m.status === 'active').map((m) => m.user_id);
  // Hide flocks you're already in (unless asked for one by id).
  const candidates = only ? rows : rows.filter((f) => !active(f).includes(callerId));

  const ids = [...new Set([callerId, ...candidates.flatMap(active)])];
  const { data: people, error: pErr } = await db
    .from('profiles')
    .select('id, username, display_name, avatar_color, budget_max, move_in, neighborhoods, habits, dealbreaker_tags')
    .in('id', ids);
  if (pErr) return { error: pErr.message, status: 500 };
  const byId = new Map(((people ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  const me = byId.get(callerId);
  if (!me) return { error: 'Create a profile first.', status: 400 };

  const result = candidates
    .map((f) => {
      const members = active(f).map((id) => byId.get(id)).filter((p): p is ProfileRow => !!p);
      const fl = f.filters ?? {};
      const open: OpenFlock = {
        members: members.map(person),
        rules: f.join_rules ?? {},
        budgetRange: fl.budget_min != null ? { min: fl.budget_min, max: fl.budget_max ?? fl.budget_min } : null,
        bedroomsNeeded: f.bedrooms_needed,
        moveIn: fl.move_in ?? null,
        areas: fl.areas ?? [],
      };
      const c = compat(person(me), open);
      return {
        id: f.id, name: f.name, about: f.about, lookingFor: f.looking_for, createdAt: f.created_at,
        members: members.map(({ id, username, display_name, avatar_color }) => ({ id, username, display_name, avatar_color })),
        maxSize: f.max_size, area: fl.areas?.[0] ?? null, budgetMin: fl.budget_min ?? null, budgetMax: fl.budget_max ?? null,
        matchPct: matchPct(c.checks, c.similarity), passes: c.passes, checks: c.checks,
      };
    })
    .sort((a, b) => b.matchPct - a.matchPct);

  return { flocks: result };
}
