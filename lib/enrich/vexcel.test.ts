// Run: node --test lib/enrich/vexcel.test.ts   (fixtures are canned Vexcel responses, see their _note; no network, no key)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalPhrase, createVexcel, parseDetect, parseProperty, squareWkt } from './vexcel.ts';

const fixture = (n: string) => JSON.parse(readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), 'utf8'));
const reply = (status: number, body: unknown) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
const LAT = 34.09692, LNG = -118.34753;

// ---------- geometry and phrases ----------
test('squareWkt is longitude first, centred, and about 2 x halfM wide', () => {
  const nums = squareWkt(LAT, LNG, 80).match(/-?\d+\.\d+/g)!.map(Number);
  assert.ok(nums[0]! < -118 && nums[1]! > 34, 'first number of each pair is the longitude (-118.x), the second the latitude (34.x)');
  const [lngs, lats] = [nums.filter((_, i) => i % 2 === 0), nums.filter((_, i) => i % 2 === 1)];
  const width = (Math.max(...lngs) - Math.min(...lngs)) * 111_320 * Math.cos((LAT * Math.PI) / 180);
  const height = (Math.max(...lats) - Math.min(...lats)) * 111_320;
  assert.ok(Math.abs(width - 160) < 1 && Math.abs(height - 160) < 1, `160 m square, got ${width.toFixed(1)} x ${height.toFixed(1)}`);
  assert.ok(Math.abs((Math.max(...lats) + Math.min(...lats)) / 2 - LAT) < 1e-6, 'centred on the point');
});

test('phrases map to what imagery can show; subjective ones are not checkable', () => {
  assert.equal(canonicalPhrase('Pool!'), 'swimming pool');
  assert.equal(canonicalPhrase('  tennis   courts '), 'tennis court');
  assert.equal(canonicalPhrase('lots of trees'), null, 'only whole known phrases match, nothing is guessed');
  assert.equal(canonicalPhrase('greenery'), 'tree cover');
  for (const subjective of ['quiet', 'safe', 'good light inside', 'walkable']) assert.equal(canonicalPhrase(subjective), null);
});

// ---------- parsing ----------
test('detect: counts and the best confidence per label; a label with no feature means none seen', () => {
  const s = parseDetect(fixture('vexcel-detect.json'), ['swimming pool', 'tennis court'])!;
  assert.deepEqual(s.byLabel['swimming pool'], { count: 2, maxConfidence: 0.70166015625 });
  assert.deepEqual(s.byLabel['tennis court'], { count: 0, maxConfidence: 0 });
  assert.deepEqual(s.imagery, { collection: 'us-ca-losangeles-2025', capturedAt: '2025-12-10' });
});

test('detect: an empty answer is a real "saw none", a malformed one is not', () => {
  assert.equal(parseDetect(fixture('vexcel-detect-empty.json'), ['swimming pool'])!.byLabel['swimming pool']!.count, 0);
  for (const bad of [null, 'x', {}, { features: 'no' }]) assert.equal(parseDetect(bad, ['swimming pool']), null);
});

test('property: any parcel with a pool counts, tree cover is the median', () => {
  const p = parseProperty(fixture('vexcel-property.json'))!;
  assert.equal(p.parcels, 4);
  assert.deepEqual(p.pool, { detected: true, maxScore: 1 });
  assert.equal(p.treeCoverPct, 6.795); // median of 13, 8.59, 5, 0
  assert.equal(p.treeCoverMaxPct, 13);
  assert.equal(p.collection, 'us-ca-glendale-2024');
});

test('property: no parcels or junk is not a result', () => {
  for (const bad of [null, {}, { features: [] }, { features: ['x'] }]) assert.equal(parseProperty(bad), null);
});

// ---------- the client, against a fake fetch ----------
test('detect: sends the key in a header (never the URL), one call for all labels, and parses the answer', async () => {
  const seen: { url: string; headers: Headers; body: { 'model-input': { elements: { label: string }[] } } }[] = [];
  const v = createVexcel({
    apiKey: 'secret-key-123',
    fetch: async (url, init) => (seen.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) }), reply(200, fixture('vexcel-detect.json'))),
  });
  const r = await v.detect(LAT, LNG, ['swimming pool', 'tennis court']);
  assert.ok(r.ok && r.value.byLabel['swimming pool']!.count === 2);
  assert.equal(seen.length, 1, 'both labels in a single call');
  assert.equal(seen[0]!.headers.get('x-api-key'), 'secret-key-123');
  assert.ok(!seen[0]!.url.includes('secret-key-123') && !seen[0]!.url.includes('api_key'));
  assert.deepEqual(seen[0]!.body['model-input'].elements.map((e) => e.label), ['swimming pool', 'tennis court']);
});

test('property: a point with no record is not_found, not an error', async () => {
  const v = createVexcel({ apiKey: 'k', fetch: async () => reply(404, { error: 'No available property data for request' }) });
  assert.deepEqual(await v.property(LAT, LNG), { ok: false, reason: 'not_found' });
});

test('every failure comes back as a reason and never throws', async () => {
  const cases: [string, () => Promise<Response>, string][] = [
    ['401', async () => reply(401, {}), 'unauthorized'],
    ['403 (outside the key\'s area)', async () => reply(403, {}), 'forbidden'],
    ['500', async () => reply(500, {}), 'server_error'],
    ['400', async () => reply(400, {}), 'bad_response'],
    ['not JSON', async () => reply(200, 'oops<html>'), 'bad_response'],
    ['wrong shape', async () => reply(200, { hello: 'world' }), 'bad_response'],
    ['network down', async () => { throw new TypeError('fetch failed'); }, 'network'],
    ['timeout', async () => { throw new DOMException('timed out', 'TimeoutError'); }, 'timeout'],
  ];
  for (const [name, doFetch, reason] of cases) {
    const v = createVexcel({ apiKey: 'k', fetch: doFetch, sleep: async () => {} });
    assert.deepEqual(await v.detect(LAT, LNG, ['swimming pool']), { ok: false, reason }, name);
  }
});

test('no key: nothing is sent', async () => {
  let called = false;
  const v = createVexcel({ apiKey: '', fetch: async () => ((called = true), reply(200, {})) });
  assert.deepEqual(await v.property(LAT, LNG), { ok: false, reason: 'no_key' });
  assert.equal(called, false);
});

test('429: waits 1 s then 2 s and tries again, then gives up as rate_limited', async () => {
  const waits: number[] = [];
  let n = 0;
  const recovering = createVexcel({ apiKey: 'k', sleep: async (ms) => void waits.push(ms), fetch: async () => (++n < 3 ? reply(429, {}) : reply(200, fixture('vexcel-detect.json'))) });
  assert.ok((await recovering.detect(LAT, LNG, ['swimming pool'])).ok);
  assert.deepEqual(waits, [1000, 2000]);

  let calls = 0;
  const stuck = createVexcel({ apiKey: 'k', maxRetries: 2, sleep: async () => {}, fetch: async () => (++calls, reply(429, {})) });
  assert.deepEqual(await stuck.detect(LAT, LNG, ['swimming pool']), { ok: false, reason: 'rate_limited' });
  assert.equal(calls, 3, 'one try plus two retries, then it stops');
});
