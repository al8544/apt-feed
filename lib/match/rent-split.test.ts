// Run: node --test 'lib/match/*.test.ts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bedroomsNeeded, combinedBudget, feasibility, suggestedSplit } from './rent-split.ts';
import type { Member } from './types.ts';

const m = (userId: string, budgetMax: number | null, status: Member['status'] = 'active'): Member => ({ userId, budgetMax, status });
const sum = (xs: { share: number }[]) => xs.reduce((s, x) => s + x.share, 0);
const doc = [m('a', 1500), m('b', 1800), m('c', 1400)];

test('the $4,700 / $4,500 example from §7.1', () => {
  assert.equal(combinedBudget(doc), 4700);
  assert.equal(feasibility(4500, null, 4700), 'fits');
  const split = suggestedSplit(4500, doc);
  // Doc shows 1436 / 1723 / 1340, which totals 4499. Exact shares are 1436.17 / 1723.40 / 1340.43,
  // so the leftover dollar goes to c (largest remainder).
  assert.deepEqual(split, [
    { userId: 'a', share: 1436 },
    { userId: 'b', share: 1723 },
    { userId: 'c', share: 1341 },
  ]);
  assert.equal(sum(split), 4500);
  split.forEach((s, i) => assert.ok(s.share <= doc[i]!.budgetMax!));
});

test('2-person flock: equal split when it fits both caps', () => {
  const two = [m('a', 2000), m('b', 1800)];
  assert.deepEqual(suggestedSplit(3500, two), [
    { userId: 'a', share: 1750 },
    { userId: 'b', share: 1750 },
  ]);
});

test('5-person flock: proportional split, adds up, nobody over cap', () => {
  const five = [m('a', 1200), m('b', 1300), m('c', 1400), m('d', 1500), m('e', 2600)];
  assert.equal(combinedBudget(five), 8000);
  const split = suggestedSplit(7999, five);
  assert.equal(sum(split), 7999);
  split.forEach((s, i) => assert.ok(s.share <= five[i]!.budgetMax!, `${s.userId} over cap`));
  assert.equal(bedroomsNeeded(null, five), 5);
  assert.equal(bedroomsNeeded(3, five), 3);
});

test('only active members count', () => {
  const flock = [...doc, m('gone', 5000, 'left'), m('maybe', 5000, 'requested')];
  assert.equal(combinedBudget(flock), 4700);
  assert.equal(suggestedSplit(4500, flock).length, 3);
  assert.equal(bedroomsNeeded(null, flock), 3);
});

test('rent range: low end passes, high end warns, both over fails', () => {
  assert.equal(feasibility(4500, 4600, 4700), 'fits');
  assert.equal(feasibility(4500, 5000, 4700), 'low-end');
  assert.equal(feasibility(4800, 5000, 4700), 'fails');
});

test('a missing budget is never assumed', () => {
  assert.equal(combinedBudget([m('a', 2000), m('b', null)]), 2000);
});
