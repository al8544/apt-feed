import { ducktectInput } from '@/lib/agent/schemas';
import { AgentHttpError } from '@/lib/agent/run';
import { startDucktect } from '@/lib/agent/ducktect-run';
import { requireUser } from '@/lib/server/auth';

// Deep Agents keeps its graph in this process's memory, so this needs a long-lived Node host (docs/DESIGN.md §8.6).
export const maxDuration = 120;

// POST /api/ducktect { flockId?, text, viewport?, filters? }: ranked picks with aerial evidence for a wish in prose (§8.9).
// Streams NDJSON events (step, todos, tool_result, error, result, done). Read-only: it never writes flock data. With no flock it runs for you alone.
export async function POST(request: Request) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;
  const parsed = ducktectInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Send { text } (up to 500 characters), and optionally { flockId, viewport, filters }.' }, { status: 400 });
  try {
    const body = await startDucktect({ db: caller.db, userId: caller.user.id, input: parsed.data });
    return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof AgentHttpError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: 'Ducktect could not start.' }, { status: 500 });
  }
}
