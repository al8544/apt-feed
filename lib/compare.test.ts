// Run: node --test lib/compare.test.ts  (Node 23+ runs TypeScript directly)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evenWeights, setWeight, toggleWeight, yourScores, type MetricKey } from './compare.ts';
import type { GroupListing } from './api.ts';

const sum = (w: object) => Object.values(w).reduce((a: number, b) => a + (b as number), 0);
const keys: MetricKey[] = ['rent', 'bedBath', 'sqft', 'ppsf', 'flockScore', 'votes', 'pets'];

test('dragging one slider keeps the total at 1 and splits the rest proportionally', () => {
  const w = setWeight(evenWeights(keys), 'rent', 0.28);
  assert.ok(Math.abs(sum(w) - 1) < 1e-9);
  assert.equal(w.rent, 0.28);
  assert.ok(Math.abs(w.sqft! - 0.72 / 6) < 1e-9);
});

test('when every other slider is at 0, the remainder is split evenly', () => {
  const w = setWeight(setWeight(evenWeights(['rent', 'sqft', 'pets']), 'rent', 1), 'rent', 0.4);
  assert.ok(Math.abs(w.sqft! - 0.3) < 1e-9 && Math.abs(w.pets! - 0.3) < 1e-9);
});

test('toggling metrics on and off renormalizes', () => {
  const off = toggleWeight(evenWeights(keys), 'pets', false);
  assert.equal(Object.keys(off).length, 6);
  assert.ok(Math.abs(sum(off) - 1) < 1e-9);
  const on = toggleWeight(off, 'pets', true);
  assert.ok(Math.abs(on.pets! - 1 / 7) < 1e-9 && Math.abs(sum(on) - 1) < 1e-9);
});

test('cheaper place scores higher on rent; ties score 50', () => {
  const l = (id: string, price: number) =>
    ({ id, price, beds: 2, baths: 1, sqft: 900, pets: true, likes: 1, match: { met: 2, total: 4, pct: 50 } }) as GroupListing;
  assert.deepEqual(yourScores([l('a', 3000), l('b', 4000)], { rent: 1 }, 4), [100, 0]);
  assert.deepEqual(yourScores([l('a', 3000), l('b', 3000)], { rent: 1 }, 4), [50, 50]);
});
