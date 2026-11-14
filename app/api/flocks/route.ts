import { parseCreateFlock } from '@/lib/flocks';
import { requireUser } from '@/lib/server/auth';

// POST /api/flocks: create a flock (friends or open); the caller becomes its admin. One database transaction (create_flock).
export async function POST(request: Request) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;

  const parsed = parseCreateFlock(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const f = parsed.value;

  const { data, error } = await caller.db.rpc('create_flock', {
    p_name: f.name, p_kind: f.kind, p_about: f.about, p_looking_for: f.looking_for, p_open_to_join: f.open_to_join,
    p_join_rules: f.join_rules, p_max_size: f.max_size, p_bedrooms_needed: f.bedrooms_needed, p_filters: f.filters,
  });
  if (error) return Response.json({ error: error.message }, { status: error.code === '28000' ? 401 : error.code === '22023' ? 400 : 500 });
  return Response.json({ id: data }, { status: 201 });
}
