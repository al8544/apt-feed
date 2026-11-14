import { askInput } from '@/lib/agent/schemas';
import { AgentHttpError, startAgent } from '@/lib/agent/run';
import { requireUser } from '@/lib/server/auth';

// Deep Agents keeps threads and pauses in this process's memory, so this needs a long-lived Node host (docs/DESIGN.md §8.6).
export const maxDuration = 120;

// POST /api/agent { flockId, message }: runs the Flock agent and streams NDJSON events (token, step, todos, tool_result, interrupt, error, done).
export async function POST(request: Request) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;
  const parsed = askInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Send { flockId, message }.' }, { status: 400 });
  try {
    const body = await startAgent({ db: caller.db, userId: caller.user.id, flockId: parsed.data.flockId, input: { message: parsed.data.message } });
    return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof AgentHttpError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: 'The agent could not start.' }, { status: 500 });
  }
}
