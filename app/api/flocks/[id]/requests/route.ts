import { adminClient } from '@/lib/server/admin';
import { requireUser } from '@/lib/server/auth';
import { discover } from '@/lib/server/discover';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/flocks/[id]/requests: the people asking to join this flock, oldest first, each scored against the flock's rules (Figma 05f).
// Admins only. Includes the person's three prompt answers (about, looking for, dealbreakers): they wrote them to be read when asking to join. Answering is the answer_join_request database function (it checks the admin and the seat limit again).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;
  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ error: 'Not a flock id.' }, { status: 400 });

  const { data: me } = await caller.db.from('flock_members').select('role, status').eq('flock_id', id).eq('user_id', caller.user.id).maybeSingle();
  if (me?.role !== 'admin' || me.status !== 'active') return Response.json({ error: 'Only an admin can see join requests.' }, { status: 403 });

  let db;
  try {
    db = adminClient();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
  const { data: rows, error } = await db.from('flock_members').select('user_id, created_at').eq('flock_id', id).eq('status', 'requested').order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const ids = (rows ?? []).map((r) => r.user_id as string);
  if (!ids.length) return Response.json({ requests: [] });

  const { data: people, error: pErr } = await db
    .from('profiles')
    .select('id, username, display_name, avatar_color, about, looking_for, dealbreakers_text, budget_max, beds_min, neighborhoods, move_in, pets')
    .in('id', ids);
  if (pErr) return Response.json({ error: pErr.message }, { status: 500 });
  const byId = new Map((people ?? []).map((p) => [p.id as string, p]));

  // The same compat() the person saw in Find a flock, run from their side: one discover() per requester (a handful at most).
  const requests = await Promise.all(
    (rows ?? []).map(async (r) => {
      const found = await discover(r.user_id as string, id);
      const f = 'flocks' in found ? found.flocks[0] : undefined;
      return { user: byId.get(r.user_id as string) ?? null, requestedAt: r.created_at as string, matchPct: f?.matchPct ?? null, checks: f?.checks ?? [] };
    })
  );
  return Response.json({ requests: requests.filter((r) => r.user) });
}
