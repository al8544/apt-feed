// Which open flocks could this person apply to? The agent reads what they wrote and what each flock wrote (docs/DESIGN.md §8.3,
// the roommate-matcher's job). Hard rules (budget, dates, areas) are applied in code BEFORE this runs; the model only judges fit
// in words, and everything it returns is checked here, so a wrong id or an invented number never reaches the screen.
import * as z from 'zod';
import { initChatModel } from 'langchain';
import { DEFAULT_MODEL } from './flock-agent.ts';
import { inventedNumbers } from './guard.ts';
import { MATCHER_PROMPT } from './prompts.ts';

export type Seeker = { about: string | null; lookingFor: string | null; dealbreakers: string | null };
// Only what Find a flock already shows anyone: an open flock's public text. Never a member's profile, budget or habits (§7.4).
export type Candidate = { id: string; name: string; about: string | null; lookingFor: string | null; area: string | null };
export type Match = { flockId: string; fit: 'strong' | 'possible' | 'weak'; reason: string };

export const fitSchema = z.object({
  matches: z.array(z.object({
    flockId: z.string().describe('The flock id, copied exactly'),
    fit: z.enum(['strong', 'possible', 'weak']),
    reason: z.string().describe('One or two plain sentences pointing at what the person and the flock wrote'),
  })),
});
export type Analyze = (system: string, prompt: string) => Promise<z.infer<typeof fitSchema>>;

export const FALLBACK_REASON = 'Looks like it could fit what you described.';
const MAX_TEXT = 2000;

// Angle brackets are dropped so nobody's text can close the <person> / <flock> tags that mark it as data.
const clean = (s: string | null) => (s ?? '').replace(/[<>]/g, '').trim().slice(0, MAX_TEXT) || '(nothing written)';

export function buildPrompt(me: Seeker, flocks: Candidate[]): string {
  const person = `<person>\nAbout them: ${clean(me.about)}\nLooking for: ${clean(me.lookingFor)}\nDealbreakers: ${clean(me.dealbreakers)}\n</person>`;
  const list = flocks.map(
    (f) => `<flock id="${f.id}">\nName: ${clean(f.name)}\nArea: ${clean(f.area)}\nAbout: ${clean(f.about)}\nLooking for: ${clean(f.lookingFor)}\n</flock>`
  );
  return [person, ...list].join('\n\n');
}

// The client's default is six retries with growing waits (over a minute when the model is down). Two tries of 25s at most stay under
// the route's 60s limit, and the page falls back to the rule-based list.
const askModel: Analyze = async (system, prompt) => {
  const model = (await initChatModel(DEFAULT_MODEL, { timeout: 25_000, maxRetries: 1 })).withStructuredOutput(fitSchema);
  return fitSchema.parse(await model.invoke([{ role: 'system', content: system }, { role: 'user', content: prompt }]));
};

// Every candidate comes back with a fit, in the order we sent them: ids the model invented or repeated are dropped, flocks it skipped
// are asked about once more, and any still missing get 'possible' with a plain reason (the page shows a % for every flock it lists).
// `analyze` is swappable so tests need no API key.
export async function analyzeFlocks(me: Seeker, candidates: Candidate[], analyze: Analyze = askModel): Promise<Match[]> {
  if (!candidates.length) return [];
  const first = await readFlocks(me, candidates, analyze);
  const missing = candidates.filter((c) => !first.has(c.id));
  const second = missing.length ? await readFlocks(me, missing, analyze) : new Map<string, Match>();
  return candidates.map(
    (c) => first.get(c.id) ?? second.get(c.id) ?? { flockId: c.id, fit: 'possible', reason: 'Not enough written to tell yet.' }
  );
}

async function readFlocks(me: Seeker, candidates: Candidate[], analyze: Analyze): Promise<Map<string, Match>> {
  const prompt = buildPrompt(me, candidates);
  const { matches } = await analyze(MATCHER_PROMPT, prompt);

  const sent = new Set(candidates.map((c) => c.id));
  const kept = new Map<string, Match>();
  for (const m of matches) {
    if (!sent.has(m.flockId) || kept.has(m.flockId)) continue;
    const invented = inventedNumbers(m.reason, [prompt]).length > 0; // a rent or percentage nobody gave it
    kept.set(m.flockId, { flockId: m.flockId, fit: m.fit, reason: invented ? FALLBACK_REASON : m.reason.trim().slice(0, 300) });
  }
  return kept;
}
