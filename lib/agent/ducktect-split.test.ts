// Run: node --test lib/agent/ducktect-split.test.ts   (no model, no network: the keyword fallback, and the rules that hold a model's reading to the facts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaLabel, areaViewport, aroundChecks, imageryLabels, normalizeInterpretation, ruleSplit, viewportFor, type Check, type Hard, type Interpreted } from './ducktect-split.ts';

type Look = { around?: [terms: string[], reach: 'walk' | 'bike' | 'drive', want?: 'near' | 'away']; imagery?: string[] };
const C = (need: string, why: string, look: Look): Check => ({
  need, why, source: 'wish',
  ...(look.around ? { around: { terms: look.around[0], reach: look.around[1], want: look.around[2] ?? 'near' } } : {}),
  ...(look.imagery ? { imagery: look.imagery } : {}),
});
const I = (hard: Partial<Hard>, checks: Check[] = [], notChecked: string[] = []): Interpreted => ({ hard: { areas: [], ...hard }, checks, notChecked, lifestyle: null });

// Ten sample wishes (ticket T15), each with the reading a careful person would make from the words alone (the model also reads the person; this is the fallback).
const FIXTURES: [string, Interpreted][] = [
  ['sunny 3 bed with a pool and trees near a park, under 4,700', I({ maxRent: 4700, beds: 3 }, [C('a swimming pool', 'asked for a pool', { imagery: ['swimming pool'] }), C('trees and greenery', 'asked for greenery', { imagery: ['tree cover'] }), C('a park', 'asked for a park', { around: [['park', 'playground'], 'walk'] })], ['sunny'])],
  ['2 bedroom in Silver Lake with a tennis court under $3.5k', I({ maxRent: 3500, beds: 2, areas: ['Silver Lake'] }, [C('a tennis court', 'asked for tennis', { imagery: ['tennis court'] })])],
  ['quiet studio, pet friendly, max $2,200', I({ maxRent: 2200, beds: 0, pets: true }, [], ['quiet'])],
  ['dog friendly 4 bedroom in Culver City with lots of trees', I({ beds: 4, pets: true, areas: ['Culver City'] }, [C('trees and greenery', 'asked for greenery', { imagery: ['tree cover'] })])],
  ['luxury apartment with a rooftop pool', I({}, [C('a rooftop deck', 'asked for a rooftop', { imagery: ['rooftop deck'] }), C('a swimming pool', 'asked for a pool', { imagery: ['swimming pool'] })], ['luxury'])],
  ['walkable, safe, close to transit', I({}, [C('errands on foot', 'asked for walkable', { around: [['supermarket', 'cafe', 'pharmacy'], 'walk'] }), C('easy transit', 'asked about getting around', { around: [['station', 'metro', 'subway'], 'walk'] })], ['safe'])],
  ['two bedroom under $4k in Echo Park or Los Feliz', I({ maxRent: 4000, beds: 2, areas: ['Echo Park', 'Los Feliz'] })],
  ['3 br with a big yard and a pool, budget of $5,000', I({ maxRent: 5000, beds: 3 }, [C('outdoor space to use', 'wants somewhere to be outside', { around: [['park', 'garden', 'playground'], 'walk'], imagery: ['tree cover'] }), C('a swimming pool', 'asked for a pool', { imagery: ['swimming pool'] })])],
  ['somewhere cozy', I({}, [], ['cozy'])],
  ['3 bed under 4.7k near the mall with a pool', I({ maxRent: 4700, beds: 3 }, [C('shopping nearby', 'asked for shopping', { around: [['mall', 'shopping'], 'walk'] }), C('a swimming pool', 'asked for a pool', { imagery: ['swimming pool'] })])],
];

for (const [text, expected] of FIXTURES) {
  test(`ruleSplit: "${text}"`, () => assert.deepEqual(ruleSplit(text), expected));
}

test('ruleSplit: "away from" turns a need around: stay clear of it, not near it', () => {
  const r = ruleSplit('quiet 2 bed, not near the bars');
  assert.deepEqual(r.checks.map((c) => [c.need, c.around?.want]), [['away from nightlife', 'away']]);
  assert.deepEqual(r.notChecked, ['quiet']);
});

test('ruleSplit: a bare number is bedrooms or a count, never rent', () => {
  assert.equal(ruleSplit('3 bed 2 bath').hard.maxRent, undefined);
  assert.equal(ruleSplit('a 2 bedroom').hard.maxRent, undefined);
});

test('ruleSplit: "parking" is not a parking lot, a place name is not a feature, and empty text does not crash', () => {
  assert.deepEqual(ruleSplit('apartment with parking').checks, []);
  assert.deepEqual(ruleSplit('2 bed in Echo Park').checks, [], '"Echo Park" is a neighborhood, not a request for a park');
  assert.deepEqual(ruleSplit('').hard, { areas: [] });
});

// ---------- holding the model's reading to the rules ----------
test("the model's checks keep their words; terms are made safe and the reach and want are checked", () => {
  const out = normalizeInterpretation({
    lifestyle: 'Assuming you climb most evenings and work from home.',
    checks: [{ need: 'a place to climb', why: 'mentioned climbing', source: 'wish', around: { terms: ['Climbing', 'bouldering', "'); drop table x; --"], reach: 'bike', want: 'near' }, imagery: ['basketball court'] }],
  });
  assert.equal(out.lifestyle, 'Assuming you climb most evenings and work from home.');
  assert.deepEqual(out.checks[0]!.around, { terms: ['climbing', 'bouldering', 'drop table'], reach: 'bike', want: 'near' });
  assert.deepEqual(out.checks[0]!.imagery, ['basketball court']);
  const odd = normalizeInterpretation({ checks: [{ need: 'x', around: { terms: ['gym'], reach: 'teleport', want: 'maybe' } }] });
  assert.deepEqual(odd.checks[0]!.around, { terms: ['gym'], reach: 'walk', want: 'near' }, 'an unknown reach is a walk; an unknown want is near');
});

test('what must not match is kept, made safe, and limited', () => {
  const out = normalizeInterpretation({ checks: [{ need: 'a hospital', around: { terms: ['hospital'], without: ['Veterinary', 'animal', "x'); drop", 'a', 'b1', 'b2', 'b3'], reach: 'drive' } }] });
  assert.deepEqual(out.checks[0]!.around!.without, ['veterinary', 'animal', 'drop', 'b1']);
  assert.equal(normalizeInterpretation({ checks: [{ need: 'a gym', around: { terms: ['gym'] } }] }).checks[0]!.around!.without, undefined);
});

test('a need with nothing to look at it with is named as not checked, never guessed', () => {
  const out = normalizeInterpretation({ checks: [
    { need: 'natural light', imagery: ['good light inside'] },
    { need: 'a quiet street', around: { terms: [] }, imagery: null },
    { need: 'trees', imagery: ['trees'] },
  ] });
  assert.deepEqual(out.checks.map((c) => c.need), ['trees']);
  assert.deepEqual(out.notChecked, ['natural light', 'a quiet street']);
});

test('limits: five checks, three imagery labels in all, six terms each', () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ need: `need ${i}`, around: { terms: Array.from({ length: 9 }, (_, k) => `term${k}x`) } }));
  const out = normalizeInterpretation({ checks: many });
  assert.equal(out.checks.length, 5);
  assert.equal(out.checks[0]!.around!.terms.length, 6);
  assert.deepEqual(out.notChecked, ['need 5', 'need 6']);
  const imagery = normalizeInterpretation({ checks: ['pool', 'tennis court', 'solar panels', 'rooftop deck', 'skate park'].map((l, i) => ({ need: `n${i}`, imagery: [l] })) });
  assert.deepEqual(imageryLabels(imagery), ['swimming pool', 'tennis court', 'solar panels'], 'the detector gets at most three labels');
  assert.deepEqual(imagery.notChecked, ['n3', 'n4']);
});

test('areas are matched to places we can locate; the rest are named as not recognized; numbers are kept sane', () => {
  const out = normalizeInterpretation({ hard: { areas: ['silver lake', 'Pasadena'], maxRent: 4700.4, beds: 3, minBaths: 2, minSqft: 900, pets: true } });
  assert.deepEqual(out.hard, { maxRent: 4700, beds: 3, minBaths: 2, minSqft: 900, pets: true, areas: ['Silver Lake'] });
  assert.deepEqual(out.notChecked, ['Pasadena (area not recognized)']);
  assert.deepEqual(normalizeInterpretation({ hard: { maxRent: -5, beds: 15, minBaths: 40, minSqft: 5, maxRent2: 1 } as never }).hard, { areas: [] });
});

test('helpers: which checks look around, which look from above', () => {
  const i = I({}, [C('a', 'x', { around: [['gym'], 'walk'] }), C('b', 'x', { imagery: ['swimming pool'] }), C('c', 'x', { around: [['cafe'], 'walk'], imagery: ['swimming pool', 'tree cover'] })]);
  assert.deepEqual(aroundChecks(i).map((c) => c.need), ['a', 'c']);
  assert.deepEqual(imageryLabels(i), ['swimming pool', 'tree cover']);
});

// ---------- where a named area is ----------
test('a named area becomes a box around it; several become one box; a home is labelled by the area it is in', () => {
  const a = areaViewport('Silver Lake')!, b = areaViewport('Venice')!;
  assert.ok(a.south < 34.0869 && a.north > 34.0869 && a.west < -118.2702 && a.east > -118.2702);
  const both = viewportFor(['Silver Lake', 'Venice'])!;
  assert.ok(both.south <= b.south && both.north >= a.north && both.west <= b.west && both.east >= a.east);
  assert.equal(viewportFor([]), null);
  assert.equal(areaViewport('Atlantis'), null);
  assert.equal(areaLabel(34.0872, -118.2705), 'Silver Lake');
  assert.equal(areaLabel(35.5, -118.2), null, 'nowhere we can name');
});
