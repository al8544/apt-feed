import { requireUser } from '@/lib/server/auth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/flocks/[id]/join: calls the join_flock database function (one transaction: lock, rules, max_size).
// Answers { status }: joined | requested | full | closed | already_member.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;

  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ error: 'Not a flock id.' }, { status: 400 });

  const { data, error } = await caller.db.rpc('join_flock', { p_flock_id: id });
  if (error) return Response.json({ error: error.message }, { status: error.code === '28000' ? 401 : error.code === 'P0002' ? 404 : 500 });
  return Response.json({ status: data }, { status: data === 'joined' || data === 'already_member' ? 200 : data === 'requested' ? 202 : 409 });
}
