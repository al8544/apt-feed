// What Ducktect tells the person about HOW it answered: the degraded modes and the limits (docs/DESIGN.md §8.9). Pure, so the wording is tested
// and the panel only prints it. Every sentence comes from the result, never from the model.
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

export function notesFor(r: DucktectResult): Note[] {
  const out: Note[] = [];

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
  if (r.interpreted.visual.length) {
    if (r.aerial === 'unavailable') out.push({ tone: 'warn', text: 'Aerial check unavailable, so these are ranked on listing data only.' });
    else if (r.aerial === 'partial') out.push({ tone: 'info', text: `Aerial imagery covered ${r.aerialPlaces} of ${r.checked} places; the rest read "unavailable".` });
  } else if (r.picks.length) {
    out.push({ tone: 'info', text: 'No visual details in your wish, so the aerial imagery step was skipped.' });
  }
  if (!r.viaModel) out.push({ tone: 'info', text: "Read with Ducktect's rules instead of the AI agent, so there is no written summary." });

  // Limits: never imply a place we did not look at was considered.
  if (r.considered > r.checked) out.push({ tone: 'info', text: `Checked ${r.checked} of ${r.considered}${r.truncated ? '+' : ''} places that fit.` });
  if (r.interpreted.notChecked.length) out.push({ tone: 'info', text: `Not checked: ${list(r.interpreted.notChecked)}.` });
  if (r.area) out.push({ tone: 'info', text: `Looking in ${list(r.area.names)}.` });
  return out;
}
