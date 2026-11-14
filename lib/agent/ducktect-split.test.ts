// Run: node --test lib/agent/ducktect-split.test.ts   (no model, no network: the rule splitter and the validator that holds a model's split to the rules)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaViewport, normalizeInterpretation, ruleSplit, viewportFor, type Interpreted } from './ducktect-split.ts';

const I = (hard: Partial<Interpreted['hard']>, visual: string[] = [], notChecked: string[] = []): Interpreted => ({ hard: { areas: [], ...hard }, visual, notChecked });

// Ten sample wishes (ticket T15), each with the split a careful person would make.
const FIXTURES: [string, Interpreted][] = [
  ['sunny 3 bed with a pool and trees near a park, under 4,700', I({ maxRent: 4700, beds: 3 }, ['swimming pool', 'tree cover'], ['sunny', 'park nearby'])],
  ['2 bedroom in Silver Lake with a tennis court under $3.5k', I({ maxRent: 3500, beds: 2, areas: ['Silver Lake'] }, ['tennis court'])],
  ['quiet studio, pet friendly, max $2,200', I({ maxRent: 2200, beds: 0, pets: true }, [], ['quiet'])],
  ['dog friendly 4 bedroom in Culver City with lots of trees', I({ beds: 4, pets: true, areas: ['Culver City'] }, ['tree cover'])],
  ['luxury apartment with a rooftop pool', I({}, ['swimming pool'], ['luxury'])],
  ['walkable, safe, close to transit', I({}, [], ['walkable', 'safe', 'transit'])],
  ['two bedroom under $4k in Echo Park or Los Feliz', I({ maxRent: 4000, beds: 2, areas: ['Echo Park', 'Los Feliz'] })],
  ['3 br with a big yard and a pool, budget of $5,000', I({ maxRent: 5000, beds: 3 }, ['swimming pool'], ['large yard'])],
  ['somewhere cozy', I({}, [], ['cozy'])],
  ['3 bed under 4.7k near the mall with a pool', I({ maxRent: 4700, beds: 3 }, ['swimming pool'], ['shopping center nearby'])],
];

for (const [text, expected] of FIXTURES) {
  test(`ruleSplit: "${text}"`, () => assert.deepEqual(ruleSplit(text), expected));
}

test('ruleSplit: a bare number is bedrooms or a count, never rent', () => {
  assert.equal(ruleSplit('3 bed 2 bath').hard.maxRent, undefined);
  assert.equal(ruleSplit('a 2 bedroom').hard.maxRent, undefined);
});

test('ruleSplit: "parking" is not a visual parking lot, and "pool table" style noise does not crash', () => {
  assert.deepEqual(ruleSplit('apartment with parking').visual, []);
  assert.deepEqual(ruleSplit('').hard, { areas: [] });
});

// ---------- holding a model's split to the rules ----------
test('a "visual" phrase imagery cannot show moves to not-checkable, and the rest are named canonically', () => {
  const out = normalizeInterpretation({ visual: ['pools', 'park', 'Greenery', 'good light inside', 'swimming pool'] });
  assert.deepEqual(out.visual, ['swimming pool', 'tree cover'], 'aliases canonicalized, duplicates dropped');
  assert.deepEqual(out.notChecked, ['park', 'good light inside']);
});

test('areas are matched to places we can locate; the rest are named as not recognized', () => {
  const out = normalizeInterpretation({ hard: { areas: ['silver lake', 'Pasadena'] } });
  assert.deepEqual(out.hard.areas, ['Silver Lake']);
  assert.deepEqual(out.notChecked, ['Pasadena (area not recognized)']);
});

test('nonsense numbers are dropped, not passed to the search', () => {
  assert.deepEqual(normalizeInterpretation({ hard: { maxRent: -5, beds: 15 } }).hard, { areas: [] });
  assert.deepEqual(normalizeInterpretation({ hard: { maxRent: 4700.4, beds: 3, pets: true } }).hard, { maxRent: 4700, beds: 3, pets: true, areas: [] });
  assert.deepEqual(normalizeInterpretation({ hard: { maxRent: Number.NaN } }).hard, { areas: [] });
});

test('lists are capped and tidy', () => {
  const out = normalizeInterpretation({ notChecked: Array.from({ length: 20 }, (_, i) => `wish ${i}`).concat(['  wish 1  ']) });
  assert.equal(out.notChecked.length, 8);
  assert.equal(new Set(out.notChecked).size, 8);
});

// ---------- where a named area is ----------
test('a named area becomes a box around it; several areas become one box covering them', () => {
  const a = areaViewport('Silver Lake')!, b = areaViewport('Venice')!;
  assert.ok(a.south < 34.0869 && a.north > 34.0869 && a.west < -118.2702 && a.east > -118.2702);
  const both = viewportFor(['Silver Lake', 'Venice'])!;
  assert.ok(both.south <= b.south && both.north >= a.north && both.west <= b.west && both.east >= a.east);
  assert.equal(viewportFor([]), null);
  assert.equal(areaViewport('Atlantis'), null);
});
