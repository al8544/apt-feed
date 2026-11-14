import { rerunShortlist } from '@/lib/agent/feedback';
import { supabaseStore } from '@/lib/agent/store';
import { requireUser } from '@/lib/server/auth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/flocks/[id]/join: calls the join_flock database function (one transaction: lock, rules, max_size).
// Answers { status }: requested | mismatch | full | closed | already_member (joined = accepted an invite).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;

  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ error: 'Not a flock id.' }, { status: 400 });

  const { data, error } = await caller.db.rpc('join_flock', { p_flock_id: id });
  if (error) return Response.json({ error: error.message }, { status: error.code === '28000' ? 401 : error.code === 'P0002' ? 404 : 500 });
  // A new member changes the budget and the bedrooms needed, so the shortlist is stale. Best effort: joining never fails because of it.
  if (data === 'joined') rerunShortlist(supabaseStore(caller.db), id).catch(() => {});
  return Response.json({ status: data }, { status: data === 'joined' || data === 'already_member' ? 200 : data === 'requested' ? 202 : 409 });
}
