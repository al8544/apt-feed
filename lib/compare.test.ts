// Run: node --test lib/compare.test.ts  (Node 23+ runs TypeScript directly)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evenWeights, flockScore, removalAt, setWeight, toggleWeight, voteState, yourScores, type MetricKey } from './compare.ts';
import type { GroupListing } from './api.ts';

const sum = (w: object) => Object.values(w).reduce((a: number, b) => a + (b as number), 0);
const keys: MetricKey[] = ['rent', 'bedBath', 'sqft', 'ppsf', 'distAvg', 'distMax', 'flockScore', 'votes', 'pets'];

test('dragging one slider keeps the total at 1 and splits the rest proportionally', () => {
  const w = setWeight(evenWeights(keys), 'rent', 0.28);
  assert.ok(Math.abs(sum(w) - 1) < 1e-9);
  assert.equal(w.rent, 0.28);
  assert.ok(Math.abs(w.sqft! - 0.72 / 8) < 1e-9);
});

test('when every other slider is at 0, the remainder is split evenly', () => {
  const w = setWeight(setWeight(evenWeights(['rent', 'sqft', 'pets']), 'rent', 1), 'rent', 0.4);
  assert.ok(Math.abs(w.sqft! - 0.3) < 1e-9 && Math.abs(w.pets! - 0.3) < 1e-9);
});

test('toggling metrics on and off renormalizes', () => {
  const off = toggleWeight(evenWeights(keys), 'pets', false);
  assert.equal(Object.keys(off).length, 8);
  assert.ok(Math.abs(sum(off) - 1) < 1e-9);
  const on = toggleWeight(off, 'pets', true);
  assert.ok(Math.abs(on.pets! - 1 / 9) < 1e-9 && Math.abs(sum(on) - 1) < 1e-9);
});

test('cheaper place scores higher on rent; ties score 50', () => {
  const l = (id: string, price: number) =>
    ({ id, price, beds: 2, baths: 1, sqft: 900, pets: true, likes: 1, match: { met: 2, total: 4, pct: 50 } }) as GroupListing;
  assert.deepEqual(yourScores([l('a', 3000), l('b', 4000)], { rent: 1 }, 4), [100, 0]);
  assert.deepEqual(yourScores([l('a', 3000), l('b', 3000)], { rent: 1 }, 4), [50, 50]);
});

test('the closer place scores higher on distance; a place with no pin data ranks last and never makes a NaN', () => {
  const l = (id: string, pinAvgMi: number | null) =>
    ({ id, price: 3000, beds: 2, baths: 1, sqft: 900, pets: true, likes: 1, pinAvgMi, match: { met: 2, total: 4, pct: 50 } }) as GroupListing;
  assert.deepEqual(yourScores([l('near', 2), l('far', 8)], { distAvg: 1 }, 4), [100, 0]);
  assert.deepEqual(yourScores([l('near', 2), l('unknown', null)], { distAvg: 1 }, 4), [100, 0]);
  assert.deepEqual(yourScores([l('a', null), l('b', null)], { distAvg: 1 }, 4), [50, 50]); // nobody set a pin: no one is favored
});

// ---- thumbs voting and the flock score (ticket T8, docs/DESIGN.md §7.3) ----
test('flock score is round(70 x up/size + 0.3 x fit), from the votes as they stand', () => {
  const fit = (pct: number) => ({ met: 0, total: 4, pct });
  assert.equal(flockScore({ likes: 3, match: fit(75) }, 4), 75); // 52.5 + 22.5
  assert.equal(flockScore({ likes: 0, match: fit(100) }, 4), 30); // no thumbs-up still gets the fit part
  assert.equal(flockScore({ likes: 2, match: fit(50) }, 2), 85); // everyone up: 70 + 15
  assert.equal(flockScore({ likes: 1, match: fit(50) }, 0), 15); // an empty flock never divides by zero
});

test('the score changes when the flock grows, because it is never stored', () => {
  const l = { likes: 2, match: { met: 2, total: 4, pct: 50 } };
  assert.equal(flockScore(l, 2), 85);
  assert.equal(flockScore(l, 4), 50); // two more people joined and have not voted: 35 + 15
});

test('thumbs-down removes a place at half the flock, rounded up: 1 of 2, 2 of 3, 2 of 4, 3 of 5', () => {
  const cases: [size: number, at: number][] = [[2, 1], [3, 2], [4, 2], [5, 3], [6, 3], [7, 4]];
  for (const [size, at] of cases) {
    assert.equal(removalAt(size), at, `removal point for ${size}`);
    assert.equal(voteState(at, size).removed, true, `${at} of ${size} removes`);
    assert.equal(voteState(at - 1, size).removed, false, `${at - 1} of ${size} does not`);
  }
});

test('any thumbs-down short of the removal point is contested; none is neither; removed is not also contested', () => {
  assert.deepEqual(voteState(0, 4), { removed: false, contested: false });
  assert.deepEqual(voteState(1, 4), { removed: false, contested: true });
  assert.deepEqual(voteState(2, 4), { removed: true, contested: false });
  assert.deepEqual(voteState(1, 2), { removed: true, contested: false });
});

test('an empty flock removes nothing', () => {
  assert.deepEqual(voteState(3, 0), { removed: false, contested: true });
});
