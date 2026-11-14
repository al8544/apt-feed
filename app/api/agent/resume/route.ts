import { resumeInput } from '@/lib/agent/schemas';
import { AgentHttpError, startAgent } from '@/lib/agent/run';
import { requireUser } from '@/lib/server/auth';

export const maxDuration = 120;

// POST /api/agent/resume { flockId, decisions }: approve or reject the paused action (e.g. send_invites) and keep streaming.
// The thread is derived from the caller and the flock, so nobody can resume someone else's pause.
export async function POST(request: Request) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;
  const parsed = resumeInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Send { flockId, decisions: [{ type: "approve" | "reject" }] }.' }, { status: 400 });
  try {
    const body = await startAgent({ db: caller.db, userId: caller.user.id, flockId: parsed.data.flockId, input: { decisions: parsed.data.decisions } });
    return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof AgentHttpError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: 'The agent could not resume.' }, { status: 500 });
  }
}
