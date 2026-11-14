// Run: node --test 'lib/match/*.test.ts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closestMisses, fit } from './listing-fit.ts';
import type { FlockNeeds, Listing } from './types.ts';

const flock = (over: Partial<FlockNeeds> = {}): FlockNeeds => ({
  members: [
    { userId: 'a', status: 'active', budgetMax: 1500 },
    { userId: 'b', status: 'active', budgetMax: 1800 },
    { userId: 'c', status: 'active', budgetMax: 1400 },
  ],
  bedroomsNeeded: null,
  areas: [],
  needsPets: false,
  dealbreakers: [],
  ...over,
});
const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 'l1', rentMin: 4500, rentMax: null, beds: 3, pets: true, neighborhood: 'Echo Park', ...over,
});
const crit = (f: ReturnType<typeof fit>, key: string) => f.criteria.find((c) => c.key === key);

test('passes when every hard constraint holds, with the split', () => {
  const f = fit(listing(), flock());
  assert.equal(f.passes, true);
  assert.equal(f.fitPct, 100);
  assert.equal(f.suggestedSplit.reduce((s, x) => s + x.share, 0), 4500);
});

test('hard constraints fail: over budget, too few beds, wrong area', () => {
  const f = fit(listing({ rentMin: 4800, beds: 2, neighborhood: 'Venice' }), flock({ areas: ['Echo Park', 'Silver Lake'] }));
  assert.equal(f.passes, false);
  assert.deepEqual(f.criteria.filter((c) => !c.ok).map((c) => c.key), ['budget', 'beds', 'area']);
  assert.equal(f.fitPct, 0);
  assert.deepEqual(f.suggestedSplit, []);
});

test('rent range: low end passes with a warning', () => {
  const f = fit(listing({ rentMax: 5200 }), flock());
  assert.equal(f.passes, true);
  assert.match(crit(f, 'budget')!.detail, /low end/);
});

test('unknown pets is a warning, not a fail, and leaves fitPct over known criteria', () => {
  const f = fit(listing({ pets: null }), flock({ needsPets: true }));
  assert.equal(f.passes, true);
  assert.equal(crit(f, 'pets')!.ok, null);
  assert.equal(f.fitPct, 100); // budget + beds known and true; pets not counted
  assert.equal(fit(listing({ pets: false }), flock({ needsPets: true })).passes, false);
});

test('structured dealbreaker tags', () => {
  const f = fit(listing({ tags: ['no-laundry', 'parking'] }), flock({ dealbreakers: ['no-laundry'] }));
  assert.equal(crit(f, 'dealbreakers')!.ok, false);
  assert.equal(fit(listing({ tags: ['parking'] }), flock({ dealbreakers: ['no-laundry'] })).passes, true);
  assert.equal(crit(fit(listing(), flock({ dealbreakers: ['no-laundry'] })), 'dealbreakers')!.ok, null); // tags unknown
});

test('area match ignores case and spaces', () => {
  assert.equal(fit(listing({ neighborhood: 'echo park ' }), flock({ areas: ['Echo Park'] })).passes, true);
});

test('closest misses: fewest failures first, with a relaxation each', () => {
  const ls = [
    listing({ id: 'two-fails', rentMin: 6000, beds: 2 }),
    listing({ id: 'near-budget', rentMin: 5000 }), // $300 over a $4,700 budget = within 10%
    listing({ id: 'fits' }),
    listing({ id: 'area', neighborhood: 'Venice' }),
  ];
  const misses = closestMisses(ls, flock({ areas: ['Echo Park'] }));
  assert.deepEqual(misses.map((m) => m.listing.id), ['area', 'near-budget', 'two-fails']);
  assert.deepEqual(misses[0]!.relax, ['add Venice to your areas']);
  assert.match(misses[1]!.relax[0]!, /raise the combined budget by \$300 \(7%\)/);
  assert.deepEqual(misses[2]!.failing, ['budget', 'beds']);
  assert.match(misses[2]!.relax[0]!, /over budget/);
});
