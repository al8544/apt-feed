// What Ducktect tells the person about HOW it answered: how it read their day, the degraded modes and the limits (docs/DESIGN.md §8.9).
// Pure, so the wording is tested and the panel only prints it. Every sentence comes from the result, never from the model.
import { REACH_WORDS } from '../enrich/places.ts';
import type { DucktectResult } from './ducktect.ts';

export type Note = { tone: 'info' | 'warn'; text: string };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (xs: string[]) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

// The model's summary, held to two sentences and 220 characters: the screen shows everything else, so this is only a headline.
export function conciseSummary(text: string): string {
  const flat = text.replace(/\s+/g, ' ').replace(/\s*[\u2014\u2013]{1,2}\s*/g, ', ').trim();
  const sentences = flat.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [flat];
  const two = sentences.slice(0, 2).map((x) => x.trim()).join(' ');
  return two.length <= 220 ? two : `${two.slice(0, 217).replace(/\s+\S*$/, '')}…`;
}

// "How I read your day": what Ducktect decided to look for, and why, so the person can see it and correct it.
export function readingLines(r: DucktectResult): string[] {
  return r.interpreted.checks.map((c) => `${c.need}${c.why ? `: ${c.why}` : ''}${c.source === 'profile' ? ' (from your profile)' : ''}`);
}

export function notesFor(r: DucktectResult): Note[] {
  const out: Note[] = [];
  const i = r.interpreted;

  if (r.noResults) {
    const gains = r.noResults.constraints.filter((c) => c.ifRelaxed > 0);
    out.push({
      tone: 'warn',
      text: gains.length
        ? `Nothing matched. ${gains.map((c) => `Dropping "${c.detail}" would give ${plural(c.ifRelaxed, 'place')}`).join('; ')}.`
        : 'Nothing matched, even with each limit dropped on its own. Try a wider area or a different wish.',
    });
    const near = r.noResults.closest[0];
    if (near?.relax[0]) out.push({ tone: 'info', text: `Closest: ${near.address}, if you ${near.relax[0]}.` });
  }

  // Degraded modes: say what was not done, and what the ranking rests on instead.
  if (r.surroundings === 'unavailable') out.push({ tone: 'warn', text: 'Nearby-places data unavailable, so what is around each place was not checked.' });
  if (r.aerial === 'unavailable') out.push({ tone: 'warn', text: 'Aerial check unavailable, so the shortlist was not confirmed from above.' });
  else if (r.aerial === 'partial') out.push({ tone: 'info', text: `The satellite covered ${r.aerialPlaces} of the ${r.shortlisted} shortlisted places; the rest read "unavailable".` });
  if (r.surroundings === 'skipped' && r.aerial === 'skipped' && r.picks.length) out.push({ tone: 'info', text: 'Nothing in your wish needed looking around for or confirming from above, so these are ranked on listing data.' });
  for (const t of r.tightened) out.push({ tone: 'info', text: `"${t.need}" was met almost everywhere within ${REACH_WORDS[t.from]}, so it was narrowed to ${REACH_WORDS[t.to]} to tell places apart.` });
  for (const l of r.unverified) out.push({ tone: 'info', text: `The satellite showed no "${l}" at any shortlisted place, so it may not be something it recognises; it was not used to rank.` });
  for (const l of r.undistinguishing) out.push({ tone: 'info', text: `"${l}" was true of nearly every place we looked at, so it did not help tell them apart; it was not used to rank.` });
  if (!r.viaModel) out.push({ tone: 'info', text: "Read with Ducktect's rules instead of the AI agent, so it did not take your profile into account or write a rationale." });

  // Limits: never imply a place we did not look at was considered.
  if (r.picks.length || r.checked) {
    const of = r.considered > r.checked ? ` of ${r.considered}${r.truncated ? '+' : ''}` : '';
    out.push({ tone: 'info', text: `Looked around ${r.checked}${of} places that fit${r.aerial !== 'skipped' ? `, then confirmed the best ${r.shortlisted} from above` : ''}.` });
  }
  if (i.notChecked.length) out.push({ tone: 'info', text: `Not checked: ${list(i.notChecked)}.` });
  if (r.area) out.push({ tone: 'info', text: `Looking in ${list(r.area.names)}.` });
  out.push(...[r.picks.some((p) => p.evidence.some((e) => e.source === 'osm')) ? { tone: 'info' as const, text: 'Places: © OpenStreetMap contributors.' } : []].flat());
  return out;
}
