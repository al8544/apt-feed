import { analyzeFlocks } from '@/lib/agent/matcher';
import { requireUser } from '@/lib/server/auth';
import { discover } from '@/lib/server/discover';

export const maxDuration = 60;

const DAILY_LIMIT = Number(process.env.AGENT_DAILY_LIMIT ?? 60);
// shortcut: one model call reads at most this many flocks (best rule match first); page through them when there are more open flocks than this.
const MAX_FLOCKS = 15;

// POST /api/flocks/match: the agent reads what the caller wrote (about, looking_for, dealbreakers_text) and the public text of
// every open flock (best rule match first, up to MAX_FLOCKS), and answers { matches: [{ flockId, fit, reason }] } with one entry per flock sent.
// It only recommends: applying is still the person sending a request to the flock (POST /api/flocks/[id]/join), which an admin approves.
export async function POST(request: Request) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'The agent is not configured on this server (no model key).' }, { status: 503 });

  // Read as the caller, so row-level security applies: you can only ever send the model your own words.
  const { data: me, error } = await caller.db.from('profiles').select('about, looking_for, dealbreakers_text').eq('id', caller.user.id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!me || !(me.about?.trim() || me.looking_for?.trim() || me.dealbreakers_text?.trim())) {
    return Response.json({ error: 'Tell us what you are looking for first.' }, { status: 400 });
  }

  const found = await discover(caller.user.id);
  if ('error' in found) return Response.json({ error: found.error }, { status: found.status });
  // Every flock is read, full or failing a hard rule: the page scales each flock's % by its read and shows no flock without one.
  const candidates = found.flocks.slice(0, MAX_FLOCKS);
  if (!candidates.length) return Response.json({ matches: [] });

  const allowed = await caller.db.rpc('take_agent_call', { p_daily_limit: DAILY_LIMIT });
  if (allowed.error) return Response.json({ error: allowed.error.message }, { status: 500 });
  if (allowed.data !== true) return Response.json({ error: 'Daily agent limit reached. Try again tomorrow.' }, { status: 429 });

  try {
    const matches = await analyzeFlocks({ about: me.about, lookingFor: me.looking_for, dealbreakers: me.dealbreakers_text }, candidates);
    return Response.json({ matches });
  } catch {
    return Response.json({ error: 'The agent could not read your answers right now.' }, { status: 502 });
  }
}
