// Run: node --test lib/enrich/places.test.ts   (no network, no database)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceTo, memoryPlaceStore, sanitizeTerm, sanitizeTerms, surroundingsEvidence, tsQuery, withinReach, type Around, type Place } from './places.ts';

// A square park of about 200 m x 200 m; 0.0018 degrees of latitude is about 200 m.
const M = 0.0018, LNG_M = 0.00217;
const metresNorth = (m: number) => m / 111_320;
const area = (name: string | null, kind = 'park', at: [number, number] = [34, -118]): Place => ({
  id: `way/${name}`, name, kind, areaM2: 40_000, closed: true,
  pts: [[at[0], at[1]], [at[0], at[1] + LNG_M], [at[0] + M, at[1] + LNG_M], [at[0] + M, at[1]], [at[0], at[1]]],
});
const shop = (name: string | null, kind: string, northM: number): Place => ({ id: `node/${name}`, name, kind, areaM2: null, closed: false, pts: [[34 + metresNorth(northM), -118]] });
const walkNear = (...terms: string[]): Around => ({ terms, reach: 'walk', want: 'near' });

test("the model's words are made safe before they reach a query", () => {
  assert.equal(sanitizeTerm('Climbing'), 'climbing');
  assert.equal(sanitizeTerm("urgent-care!"), 'urgent care');
  assert.match(sanitizeTerm("'); drop table places; --")!, /^[a-z0-9 ]+$/, 'only letters and digits ever get through, so there is nothing to inject');
  assert.equal(sanitizeTerm('a very long sentence about something'), null, 'more than three words is not a term');
  assert.equal(sanitizeTerm('x'), null);
  assert.equal(sanitizeTerm('quiet'), null, 'a feeling is not a place');
  assert.equal(sanitizeTerm('quiet residential'), null);
  assert.equal(sanitizeTerm('quiet cafe'), 'quiet cafe', 'a place that happens to carry a quality word is still searchable');
  assert.deepEqual(sanitizeTerms(['Vegan', 'vegan', 'climbing', 'a', 'a b c d']), ['vegan', 'climbing']);
  assert.equal(sanitizeTerms(Array.from({ length: 20 }, (_, i) => `term${i}`)).length, 6, 'at most six terms');
});

test('a tsquery: words of a term all start a word, terms are alternatives, nothing else gets through', () => {
  assert.equal(tsQuery(['rock climbing', 'bouldering']), 'rock:* & climbing:* | bouldering:*');
  assert.equal(tsQuery(['hospital'], ['veterinary', 'animal control']), '(hospital:*) & !(veterinary:*) & !(animal:* & control:*)', 'what must NOT match is excluded');
  assert.equal(tsQuery(['hospital'], ['&|!']), 'hospital:*', 'an unusable exclusion is ignored, not turned into a query');
  assert.equal(tsQuery(['&|!():*']), null);
  assert.equal(tsQuery([]), null);
});

test('inside a place is distance zero; outside is the distance to its edge, not its centre', () => {
  const p = area('Echo');
  assert.equal(distanceTo(34 + M / 2, -118 + LNG_M / 2, p), 0);
  const d = distanceTo(34 + M + metresNorth(300), -118 + LNG_M / 2, p);
  assert.ok(Math.abs(d - 300) < 5, `300 m from the edge, got ${d.toFixed(1)}`);
});

test('a home beside the edge of a very big place counts as next to it, wherever its centre is', () => {
  const big: Place = { id: 'way/big', name: 'Big Park', kind: 'park', areaM2: 1e7, closed: true, pts: [[34, -118], [34, -117.9], [34.1, -117.9], [34.1, -118], [34, -118]] };
  assert.ok(distanceTo(34.05, -118 - 0.0005, big) < 60);
});

test('how far "around" reaches depends on the need: a walk, a bike ride or a drive', () => {
  const places = [shop('Near', 'cafe', 300), shop('Mid', 'gym', 1800), shop('Far', 'hospital', 5000)];
  assert.deepEqual(withinReach(34, -118, places, 'walk').map((x) => x.place.name), ['Near']);
  assert.deepEqual(withinReach(34, -118, places, 'bike').map((x) => x.place.name), ['Near', 'Mid']);
  assert.deepEqual(withinReach(34, -118, places, 'drive').map((x) => x.place.name), ['Near', 'Mid', 'Far']);
});

test('evidence names what matched, how far, and the walk; a count when there are more', () => {
  const one = surroundingsEvidence('a climbing gym', walkNear('climbing'), 34, -118, [shop('Blue Wall', 'climbing gym', 420)], true);
  assert.equal(one.status, 'found');
  assert.match(one.text, /^Blue Wall \(climbing gym\) is about (400|450) m away, a (5|6)-minute walk\.$/);
  assert.equal(one.phrase, 'a climbing gym');
  assert.equal(one.source, 'osm');
  const many = surroundingsEvidence('coffee', walkNear('cafe'), 34, -118, [shop('A', 'cafe', 100), shop('B', 'cafe', 300), shop('C', 'cafe', 600)], true);
  assert.match(many.text, /2 more within a ten-minute walk\.$/);
});

test('evidence by bike or drive says so in its minutes', () => {
  const e = surroundingsEvidence('hospital', { terms: ['hospital'], reach: 'drive', want: 'near' }, 34, -118, [shop('County Hospital', 'hospital', 4000)], true);
  assert.match(e.text, /about 4000 m away, a 10-minute drive\./);
});

test('evidence: right next door; and an unnamed place is described by what it is', () => {
  assert.equal(surroundingsEvidence('green space', walkNear('park'), 34 + M / 2, -118 + LNG_M / 2, [area('Echo Park')], true).text, 'Echo Park (park) is right next door.');
  assert.ok(surroundingsEvidence('dogs', walkNear('dog'), 34, -118, [area(null, 'dog park', [34 + metresNorth(200), -118])], true).text.startsWith('A dog park is about 200 m away'));
});

test('evidence: nothing within reach says so on the map data; no data at all says unavailable, never "none"', () => {
  const none = surroundingsEvidence('a gym', walkNear('gym', 'fitness'), 34, -118, [area('Far', 'park', [35, -118])], true);
  assert.equal(none.status, 'not_seen');
  assert.match(none.text, /Nothing matching "gym", "fitness" within a ten-minute walk on the map data\./);
  const many = surroundingsEvidence('x', walkNear('a1', 'b2', 'c3', 'd4', 'e5'), 34, -118, [], true);
  assert.match(many.text, /Nothing matching "a1", "b2", "c3" or 2 similar within/, 'a long list of words is shortened');
  const gone = surroundingsEvidence('a gym', walkNear('gym'), 34, -118, [], false);
  assert.deepEqual([gone.status, gone.text, gone.source], ['unavailable', 'Nearby-places data unavailable.', null]);
});

test('the in-memory store matches the way the database does: words start words, terms are alternatives', async () => {
  const store = memoryPlaceStore([shop('Climb Nation', 'climbing gym', 100), shop('Joe Barber', 'barber', 100), shop('Green Bar', 'bar', 100)]);
  const bounds = { south: 33, north: 35, west: -119, east: -117 };
  assert.deepEqual((await store.search(bounds, ['climb'])).places.map((p) => p.name), ['Climb Nation']);
  assert.deepEqual((await store.search(bounds, ['bar'])).places.map((p) => p.name).sort(), ['Green Bar', 'Joe Barber'], 'a prefix also matches "barber": the evidence shows the kind so it is visible');
  assert.deepEqual((await store.search(bounds, ['rock climbing'])).places, [], 'every word of a term must match');
  const hospitals = memoryPlaceStore([shop('City Hospital', 'hospital', 100), shop('Paws Animal Hospital', 'veterinary', 100)]);
  assert.deepEqual((await hospitals.search(bounds, ['hospital'])).places.map((p) => p.name).sort(), ['City Hospital', 'Paws Animal Hospital']);
  assert.deepEqual((await hospitals.search(bounds, ['hospital'], ['veterinary', 'animal'])).places.map((p) => p.name), ['City Hospital'], 'saying what not to match removes the over-match');
  assert.equal((await memoryPlaceStore([]).search(bounds, ['x'])).loaded, false);
});
