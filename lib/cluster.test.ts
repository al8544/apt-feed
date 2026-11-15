// Run: node --test lib/cluster.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cluster } from './cluster.ts';

const near = (n: number) => ({ lat: 34.05 + n * 0.0001, lng: -118.25 });
const far = { lat: 34.3, lng: -118.0 };

test('close points merge when zoomed out, and split when zoomed in', () => {
  const pts = [near(0), near(1), near(2), far];
  assert.deepEqual(cluster(pts, 10).map((c) => c.items.length).sort(), [1, 3]);
  assert.equal(cluster(pts, 15).length, 4);
});

test('a kept point is never merged', () => {
  const pts = [near(0), near(1), near(2)];
  const out = cluster(pts, 10, (p) => p === pts[1]);
  assert.deepEqual(out.map((c) => c.items.length).sort(), [1, 2]);
  assert.equal(out.reduce((n, c) => n + c.items.length, 0), 3);
});

test('the cluster sits at the average of its points', () => {
  const [c] = cluster([{ lat: 34, lng: -118 }, { lat: 34.002, lng: -118.002 }], 8);
  assert.ok(Math.abs(c!.lat - 34.001) < 1e-9 && Math.abs(c!.lng + 118.001) < 1e-9);
});
