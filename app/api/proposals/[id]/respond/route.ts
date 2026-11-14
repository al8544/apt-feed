import { requireUser } from '@/lib/server/auth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/proposals/[id]/respond with { accept: boolean }: calls respond_to_proposal (one transaction: lock, record the
// answer, create the flock on the last accept). Answers { status }: waiting | flock_created | declined | expired | closed | already_responded.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;

  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ error: 'Not a proposal id.' }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (typeof body?.accept !== 'boolean') return Response.json({ error: 'Send { "accept": true } or { "accept": false }.' }, { status: 400 });

  const { data, error } = await caller.db.rpc('respond_to_proposal', { p_proposal_id: id, p_accept: body.accept });
  if (error) {
    const status = error.code === '28000' ? 401 : error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }
  return Response.json({ status: data }, { status: data === 'expired' || data === 'closed' || data === 'already_responded' ? 409 : 200 });
}
