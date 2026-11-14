// Run: node --test lib/agent/ducktect-notes.test.ts   (the wording of each degraded mode: ticket T15 "each degraded mode shows a sensible message")
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DucktectResult } from './ducktect.ts';
import { conciseSummary, notesFor, readingLines } from './ducktect-notes.ts';

const interpreted = (over: Partial<DucktectResult['interpreted']> = {}): DucktectResult['interpreted'] => ({ hard: { areas: [] }, checks: [], notChecked: [], lifestyle: null, ...over });
const base = (over: Partial<DucktectResult> = {}): DucktectResult => ({
  interpreted: interpreted(), picks: [{ rank: 1, evidence: [] } as never], alsoConsidered: [], considered: 5, checked: 5, shortlisted: 5, truncated: false,
  surroundings: 'ok', aerial: 'ok', aerialPlaces: 5, tightened: [], unverified: [], undistinguishing: [], noResults: null, area: null, solo: true, viaModel: true, ...over,
});
const texts = (r: DucktectResult) => notesFor(r).map((n) => n.text);
const around = { need: 'a place to climb', why: 'climbs most evenings', source: 'profile' as const, around: { terms: ['climbing'], reach: 'walk' as const, want: 'near' as const } };

test('how the day was read is shown so the person can see it and correct it', () => {
  const r = base({ interpreted: interpreted({ checks: [around, { need: 'shade', why: 'asked for trees', source: 'wish', imagery: ['tree cover'] }] }) });
  assert.deepEqual(readingLines(r), ['a place to climb: climbs most evenings (from your profile)', 'shade: asked for trees']);
});

test('map data down: says what around each place was not checked', () => {
  const t = notesFor(base({ surroundings: 'unavailable' }));
  assert.deepEqual(t[0], { tone: 'warn', text: 'Nearby-places data unavailable, so what is around each place was not checked.' });
});

test('Vexcel down: says the shortlist was not confirmed from above', () => {
  assert.ok(notesFor(base({ aerial: 'unavailable', aerialPlaces: 0 })).some((n) => n.tone === 'warn' && n.text === 'Aerial check unavailable, so the shortlist was not confirmed from above.'));
});

test('only some shortlisted places got satellite evidence: says how many', () => {
  assert.ok(texts(base({ aerial: 'partial', aerialPlaces: 2, shortlisted: 5 })).includes('The satellite covered 2 of the 5 shortlisted places; the rest read "unavailable".'));
});

test('nothing to look around for or confirm: says the ranking rests on the listing', () => {
  assert.ok(texts(base({ surroundings: 'skipped', aerial: 'skipped' })).includes('Nothing in your wish needed looking around for or confirming from above, so these are ranked on listing data.'));
});

test('a label the satellite never showed is named, and said not to have been used to rank', () => {
  assert.ok(texts(base({ unverified: ['skate park'] })).includes('The satellite showed no "skate park" at any shortlisted place, so it may not be something it recognises; it was not used to rank.'));
});

test('a need whose reach was narrowed says so, and to what', () => {
  assert.ok(texts(base({ tightened: [{ need: 'quick to a hospital', from: 'drive', to: 'bike' }] })).includes('"quick to a hospital" was met almost everywhere within a fifteen-minute drive, so it was narrowed to a ten-minute bike ride to tell places apart.'));
});

test('anything true of nearly every place is named too: it told places apart no better', () => {
  assert.ok(texts(base({ undistinguishing: ['green space'] })).includes('"green space" was true of nearly every place we looked at, so it did not help tell them apart; it was not used to rank.'));
});

test('no results: names the constraint that did it and what dropping it would give', () => {
  const t = notesFor(base({
    picks: [], surroundings: 'skipped', aerial: 'skipped',
    noResults: { constraints: [{ key: 'rent', detail: 'under $1,000', ifRelaxed: 12 }, { key: 'beds', detail: '3+ bedrooms', ifRelaxed: 1 }, { key: 'pets', detail: 'pets allowed', ifRelaxed: 0 }], closest: [{ floorPlanId: 'x', address: '5 Elm St', relax: ['raise the combined budget by $120 (12%)'] }] },
  }));
  assert.equal(t[0]!.tone, 'warn');
  assert.equal(t[0]!.text, 'Nothing matched. Dropping "under $1,000" would give 12 places; Dropping "3+ bedrooms" would give 1 place.');
  assert.ok(t.some((n) => n.text === 'Closest: 5 Elm St, if you raise the combined budget by $120 (12%).'));
  assert.ok(!t.some((n) => n.text.includes('pets allowed')), 'a constraint that would not help is not blamed');
});

test('no results and no single limit explains it: says so plainly', () => {
  assert.match(texts(base({ picks: [], noResults: { constraints: [{ key: 'rent', detail: 'under $1,000', ifRelaxed: 0 }], closest: [] } }))[0]!, /Nothing matched, even with each limit dropped/);
});

test('the limits are stated: how many places were examined, and how many were confirmed from above', () => {
  assert.ok(texts(base({ considered: 127, checked: 127, shortlisted: 12 })).includes('Looked around 127 places that fit, then confirmed the best 12 from above.'));
  assert.ok(texts(base({ considered: 700, checked: 300, shortlisted: 12, truncated: true })).includes('Looked around 300 of 700+ places that fit, then confirmed the best 12 from above.'));
  assert.ok(texts(base({ aerial: 'skipped' })).includes('Looked around 5 places that fit.'), 'nothing is said about confirming when nothing was');
});

test('wishes nobody can check are named, and so is a model-free answer', () => {
  const t = texts(base({ viaModel: false, interpreted: interpreted({ notChecked: ['sunny', 'a quiet street', 'good light'] }) }));
  assert.ok(t.includes('Not checked: sunny, a quiet street and good light.'));
  assert.ok(t.some((x) => x.includes("Ducktect's rules instead of the AI agent")));
});

test('a named area is stated, and map data is credited when it was used', () => {
  const r = base({ area: { names: ['Silver Lake', 'Echo Park'], viewport: { south: 0, north: 1, west: 0, east: 1 } }, picks: [{ rank: 1, evidence: [{ phrase: 'x', status: 'found', text: 't', confidence: null, imagery: null, source: 'osm' }] } as never] });
  assert.ok(texts(r).includes('Looking in Silver Lake and Echo Park.'));
  assert.ok(texts(r).includes('Places: © OpenStreetMap contributors.'));
  assert.ok(!texts(base()).includes('Places: © OpenStreetMap contributors.'), 'no credit when the map data was not used');
});

test('the summary is a headline: two sentences at most, no dash asides, never past 220 characters', () => {
  assert.equal(conciseSummary('Best pick: 2595 S Hoover St \u2014 it matches your filters. Aerial imagery suggests a pool. Not checked: sunny. More words.'), 'Best pick: 2595 S Hoover St, it matches your filters. Aerial imagery suggests a pool.');
  assert.equal(conciseSummary('  One   sentence only  '), 'One sentence only');
  const long = conciseSummary(`${'word '.repeat(80)}end.`);
  assert.ok(long.length <= 220 && long.endsWith('…'), `cut cleanly (${long.length})`);
  assert.equal(conciseSummary(''), '');
});
