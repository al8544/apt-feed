// Run: node --test lib/agent/ducktect-notes.test.ts   (the wording of each degraded mode: ticket T15 "each degraded mode shows a sensible message")
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DucktectResult } from './ducktect.ts';
import { conciseSummary, notesFor } from './ducktect-notes.ts';

const base = (over: Partial<DucktectResult> = {}): DucktectResult => ({
  interpreted: { hard: { areas: [] }, visual: [], notChecked: [] }, picks: [{ rank: 1 } as never], alsoConsidered: [], considered: 5, checked: 5, truncated: false,
  aerial: 'ok', aerialPlaces: 5, noResults: null, area: null, solo: true, viaModel: true, ...over,
});
const texts = (r: DucktectResult) => notesFor(r).map((n) => n.text);

test('Vexcel down: says the aerial check was unavailable and what the ranking rests on', () => {
  const t = notesFor(base({ interpreted: { hard: { areas: [] }, visual: ['swimming pool'], notChecked: [] }, aerial: 'unavailable', aerialPlaces: 0 }));
  assert.deepEqual(t, [{ tone: 'warn', text: 'Aerial check unavailable, so these are ranked on listing data only.' }]);
});

test('only some places got aerial evidence: says how many', () => {
  const t = texts(base({ interpreted: { hard: { areas: [] }, visual: ['swimming pool'], notChecked: [] }, aerial: 'partial', aerialPlaces: 2, checked: 5 }));
  assert.deepEqual(t, ['Aerial imagery covered 2 of 5 places; the rest read "unavailable".']);
});

test('no visual phrase: says the aerial step was skipped, and does not pretend it ran', () => {
  assert.deepEqual(texts(base({ aerial: 'skipped' })), ['No visual details in your wish, so the aerial imagery step was skipped.']);
});

test('no results: names the constraint that did it and what dropping it would give', () => {
  const t = notesFor(base({
    picks: [], interpreted: { hard: { areas: [] }, visual: [], notChecked: [] }, aerial: 'skipped',
    noResults: { constraints: [{ key: 'rent', detail: 'under $1,000', ifRelaxed: 12 }, { key: 'beds', detail: '3+ bedrooms', ifRelaxed: 1 }, { key: 'pets', detail: 'pets allowed', ifRelaxed: 0 }], closest: [{ floorPlanId: 'x', address: '5 Elm St', relax: ['raise the combined budget by $120 (12%)'] }] },
  }));
  assert.equal(t[0]!.tone, 'warn');
  assert.equal(t[0]!.text, 'Nothing matched. Dropping "under $1,000" would give 12 places; Dropping "3+ bedrooms" would give 1 place.');
  assert.ok(t.some((n) => n.text === 'Closest: 5 Elm St, if you raise the combined budget by $120 (12%).'));
  assert.ok(!t.some((n) => n.text.includes('pets allowed')), 'a constraint that would not help is not blamed');
});

test('no results and no single limit explains it: says so plainly', () => {
  const t = texts(base({ picks: [], noResults: { constraints: [{ key: 'rent', detail: 'under $1,000', ifRelaxed: 0 }], closest: [] } }));
  assert.match(t[0]!, /Nothing matched, even with each limit dropped/);
});

test('the cap is stated, with a plus when more existed than were pulled', () => {
  assert.ok(texts(base({ considered: 127, checked: 25, truncated: true })).includes('Checked 25 of 127+ places that fit.'));
  assert.ok(texts(base({ considered: 40, checked: 25 })).includes('Checked 25 of 40 places that fit.'));
  assert.ok(!texts(base()).some((x) => x.startsWith('Checked')), 'nothing to say when everything was checked');
});

test('wishes nobody can check are named, and so is a model-free answer', () => {
  const t = texts(base({ viaModel: false, interpreted: { hard: { areas: [] }, visual: [], notChecked: ['sunny', 'park nearby', 'quiet'] } }));
  assert.ok(t.includes('Not checked: sunny, park nearby and quiet.'));
  assert.ok(t.some((x) => x.includes("Ducktect's rules instead of the AI agent")));
});

test('a named area is stated', () => {
  assert.ok(texts(base({ area: { names: ['Silver Lake', 'Echo Park'], viewport: { south: 0, north: 1, west: 0, east: 1 } } })).includes('Looking in Silver Lake and Echo Park.'));
});

test('a healthy answer says nothing it does not need to', () => {
  assert.deepEqual(notesFor(base({ interpreted: { hard: { areas: [] }, visual: ['swimming pool'], notChecked: [] } })), []);
});

test('the summary is a headline: two sentences at most, no dash asides, never past 220 characters', () => {
  assert.equal(conciseSummary('Best pick: 2595 S Hoover St \u2014 it matches your filters. Aerial imagery suggests a pool. Not checked: sunny. More words.'), 'Best pick: 2595 S Hoover St, it matches your filters. Aerial imagery suggests a pool.');
  assert.equal(conciseSummary('  One   sentence only  '), 'One sentence only');
  const long = conciseSummary(`${'word '.repeat(80)}end.`);
  assert.ok(long.length <= 220 && long.endsWith('…'), `cut cleanly (${long.length})`);
  assert.equal(conciseSummary(''), '');
});
