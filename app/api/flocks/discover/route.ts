import { requireUser } from '@/lib/server/auth';
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

// GET /api/flocks/discover[?id=<flock id>]: open flocks ranked by compatibility with the caller (Figma 00i, 00j).
// Computed here with the service key; only public fields and coarse reasons go back (§7.4 privacy).
export async function GET(request: Request) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;
  const only = new URL(request.url).searchParams.get('id');

  let db;
  try {
    db = adminClient();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  let q = db
    .from('flocks')
    .select('id, name, about, looking_for, max_size, bedrooms_needed, join_rules, filters, created_at, flock_members(user_id, status)')
    .eq('kind', 'open')
    .eq('open_to_join', true)
    .eq('discoverable', true);
  if (only) q = q.eq('id', only);
  const { data: flocks, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (flocks ?? []) as FlockRow[];
  const active = (f: FlockRow) => f.flock_members.filter((m) => m.status === 'active').map((m) => m.user_id);
  // Hide flocks you're already in (unless asked for one by id).
  const candidates = only ? rows : rows.filter((f) => !active(f).includes(caller.user.id));

  const ids = [...new Set([caller.user.id, ...candidates.flatMap(active)])];
  const { data: people, error: pErr } = await db
    .from('profiles')
    .select('id, username, display_name, avatar_color, budget_max, move_in, neighborhoods, habits, dealbreaker_tags')
    .in('id', ids);
  if (pErr) return Response.json({ error: pErr.message }, { status: 500 });
  const byId = new Map(((people ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  const me = byId.get(caller.user.id);
  if (!me) return Response.json({ error: 'Create a profile first.' }, { status: 400 });

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

  return Response.json({ flocks: result });
}
