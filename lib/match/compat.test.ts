// Run: node --test 'lib/match/*.test.ts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compat, habitSimilarity, type OpenFlock } from './compat.ts';
import type { Person } from './types.ts';

const person = (over: Partial<Person> = {}): Person => ({
  userId: 'joiner', budgetMax: 1600, moveIn: '2027-01-10', neighborhoods: ['Echo Park'], habits: {}, dealbreakerTags: [], ...over,
});
const flock = (over: Partial<OpenFlock> = {}): OpenFlock => ({
  members: [person({ userId: 'a', budgetMax: 1500 }), person({ userId: 'b', budgetMax: 1800 })],
  rules: { budget: true, beds_movein: true, areas: true },
  budgetRange: null,
  bedroomsNeeded: null,
  moveIn: '2027-01-01',
  areas: ['Echo Park', 'Silver Lake'],
  ...over,
});
const check = (r: ReturnType<typeof compat>, key: string) => r.checks.find((c) => c.key === key);

test('a compatible joiner passes every rule', () => {
  const r = compat(person(), flock());
  assert.equal(r.passes, true);
  assert.deepEqual(r.checks.map((c) => c.ok), [true, true, true, true]);
});

test('budget: no overlap fails; unknown is not a fail', () => {
  assert.equal(check(compat(person({ budgetMax: 1200 }), flock()), 'budget')!.ok, false);
  assert.equal(check(compat(person({ budgetMax: 1200 }), flock({ budgetRange: { min: 1000, max: 2000 } })), 'budget')!.ok, true);
  const r = compat(person({ budgetMax: null }), flock());
  assert.equal(check(r, 'budget')!.ok, null);
  assert.equal(r.passes, true);
});

test('beds + move-in: within 30 days, no free bedroom, unknown date', () => {
  assert.equal(check(compat(person({ moveIn: '2027-03-01' }), flock()), 'beds_movein')!.ok, false);
  assert.equal(check(compat(person(), flock({ bedroomsNeeded: 2 })), 'beds_movein')!.ok, false); // 2 members already use both
  assert.equal(check(compat(person({ moveIn: null }), flock()), 'beds_movein')!.ok, null);
});

test('areas: at least one shared, ignoring case', () => {
  assert.equal(check(compat(person({ neighborhoods: ['silver lake'] }), flock()), 'areas')!.ok, true);
  assert.equal(check(compat(person({ neighborhoods: ['Venice'] }), flock()), 'areas')!.ok, false);
});

test('only the rules the owner switched on are checked; dealbreakers always are', () => {
  const r = compat(person({ budgetMax: 100, neighborhoods: ['Venice'] }), flock({ rules: {} }));
  assert.deepEqual(r.checks.map((c) => c.key), ['dealbreakers']);
  assert.equal(r.passes, true);
});

test('dealbreaker clash works both ways and stays coarse', () => {
  const smoker = flock({ members: [person({ userId: 'a', habits: { smoking: true } })] });
  const r = compat(person({ dealbreakerTags: ['smoking'] }), smoker);
  assert.equal(r.passes, false);
  assert.equal(check(r, 'dealbreakers')!.reason, 'a habit clashes with a dealbreaker'); // never names who or what
  const strict = flock({ members: [person({ userId: 'a', dealbreakerTags: ['overnight-guests'] })] });
  assert.equal(compat(person({ habits: { guests: 'often' } }), strict).passes, false);
});

test('habit similarity: same habits score 1, opposite 0, nothing shared 0.5', () => {
  assert.equal(habitSimilarity({ sleep: 'early', cleanliness: 5 }, { sleep: 'early', cleanliness: 5 }), 1);
  assert.equal(habitSimilarity({ sleep: 'early', cleanliness: 5 }, { sleep: 'late', cleanliness: 1 }), 0);
  assert.equal(habitSimilarity({ sleep: 'early' }, { noise: 'loud' }), 0.5);
});
