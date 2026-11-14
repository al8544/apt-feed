// Run: node --test lib/flocks.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCreateFlock } from './flocks.ts';

test('a minimal friends flock is valid and gets defaults', () => {
  const r = parseCreateFlock({ name: '  Brooklyn Crew ' });
  assert.ok(r.ok);
  assert.deepEqual([r.value.name, r.value.kind, r.value.max_size, r.value.open_to_join], ['Brooklyn Crew', 'friends', null, false]);
});

test('flocks of any size from 2 up; 1, 0, fractions and absurd sizes are refused', () => {
  for (const n of [2, 3, 5, 12]) assert.ok(parseCreateFlock({ name: 'x', max_size: n }).ok);
  for (const n of [1, 0, -3, 2.5, 51, '4']) assert.equal(parseCreateFlock({ name: 'x', max_size: n }).ok, false, String(n));
});

test('name, kind and open_to_join are checked', () => {
  assert.equal(parseCreateFlock({}).ok, false);
  assert.equal(parseCreateFlock({ name: ' ' }).ok, false);
  assert.equal(parseCreateFlock({ name: 'x'.repeat(81) }).ok, false);
  assert.equal(parseCreateFlock({ name: 'x', kind: 'secret' }).ok, false);
  assert.equal(parseCreateFlock({ name: 'x', kind: 'friends', open_to_join: true }).ok, false); // only an open flock can be open to join
  assert.ok(parseCreateFlock({ name: 'x', kind: 'open', open_to_join: true }).ok);
});

test('join_rules accept only the three known rules, as booleans', () => {
  assert.ok(parseCreateFlock({ name: 'x', kind: 'open', join_rules: { budget: true, areas: false } }).ok);
  assert.equal(parseCreateFlock({ name: 'x', join_rules: { pets: true } }).ok, false);
  assert.equal(parseCreateFlock({ name: 'x', join_rules: { budget: 'yes' } }).ok, false);
});

test('non-objects and wrong types are refused, never thrown', () => {
  for (const b of [null, 'x', 7, [], undefined]) assert.equal(parseCreateFlock(b).ok, false);
  assert.equal(parseCreateFlock({ name: 'x', about: 5 }).ok, false);
  assert.equal(parseCreateFlock({ name: 'x', filters: [] }).ok, false);
});
