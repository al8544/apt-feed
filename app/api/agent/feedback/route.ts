import { feedbackInput } from '@/lib/agent/schemas';
import { AgentHttpError, runFeedback } from '@/lib/agent/run';
import { requireUser } from '@/lib/server/auth';

// POST /api/agent/feedback { flockId, listingId, reasons }: after a thumbs-down, record why and refresh the flock's shortlist.
// { flockId } alone means the flock's membership changed: refresh without a new rejection. Answers { savedIds, ruledOutBy }.
export async function POST(request: Request) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;
  const parsed = feedbackInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Send { flockId, listingId, reasons }, or { flockId } alone.' }, { status: 400 });
  try {
    return Response.json(await runFeedback({ db: caller.db, userId: caller.user.id, ...parsed.data }));
  } catch (e) {
    if (e instanceof AgentHttpError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: 'Could not update the shortlist.' }, { status: 500 });
  }
}
