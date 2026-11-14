// Run: node --test lib/enrich/aerial.test.ts   (no network, no key, no database: a fake Vexcel and an in-memory store)
// Ticket T14 done-when: the demo properties return cached aerial evidence; failures degrade cleanly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aerialEvidence, memoryAerialStore, type AerialStore } from './aerial.ts';
import { parseDetect, parseProperty, type Result, type Vexcel } from './vexcel.ts';

const fixture = (n: string) => JSON.parse(readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), 'utf8'));
const C = { id: '10000000-0000-4000-8000-000000000001', lat: 34.09692, lng: -118.34753 };

// A Vexcel that answers from canned responses and counts how often it was asked.
function fakeVexcel(opts: { detect?: unknown; property?: unknown; fail?: 'network' | 'forbidden' } = {}) {
  const calls = { detect: [] as string[][], property: 0 };
  const bad = (): Result<never> => ({ ok: false, reason: opts.fail! });
  const v = {
    async detect(_lat: number, _lng: number, labels: string[]) {
      calls.detect.push(labels);
      return opts.fail ? bad() : ({ ok: true, value: parseDetect(opts.detect ?? fixture('vexcel-detect.json'), labels)! } as const);
    },
    async property() {
      calls.property++;
      return opts.fail ? bad() : ({ ok: true, value: parseProperty(opts.property ?? fixture('vexcel-property.json'))! } as const);
    },
  } as unknown as Vexcel;
  return { v, calls };
}

test('a miss asks Vexcel once for every missing label, caches the answers, and the next ask costs nothing', async () => {
  const store = memoryAerialStore();
  const { v, calls } = fakeVexcel();
  const first = await aerialEvidence(C, ['swimming pool', 'tennis court'], { store, vexcel: v });
  assert.deepEqual(calls.detect, [['swimming pool', 'tennis court']], 'one call for both labels');
  assert.deepEqual(first.map((e) => [e.phrase, e.status, e.source]), [['swimming pool', 'found', 'live'], ['tennis court', 'not_seen', 'live']]);
  assert.equal(store.rows.size, 2, 'both answers cached, including "looked and saw none"');

  const second = await aerialEvidence(C, ['swimming pool', 'tennis court'], { store, vexcel: v });
  assert.equal(calls.detect.length, 1, 'nothing more was asked');
  assert.deepEqual(second.map((e) => [e.phrase, e.status, e.source]), [['swimming pool', 'found', 'cache'], ['tennis court', 'not_seen', 'cache']]);
});

test('cache only (no Vexcel): returns what is cached, and says unavailable for the rest', async () => {
  const store = memoryAerialStore();
  await aerialEvidence(C, ['swimming pool'], { store, vexcel: fakeVexcel().v }); // pre-warm one phrase
  const out = await aerialEvidence(C, ['swimming pool', 'parking lot'], { store });
  assert.deepEqual(out.map((e) => [e.phrase, e.status]), [['swimming pool', 'found'], ['parking lot', 'unavailable']]);
  assert.equal(out[1]!.text, 'Aerial check unavailable.');
});

test('failures degrade cleanly: unavailable, nothing cached, nothing thrown', async () => {
  for (const fail of ['network', 'forbidden'] as const) {
    const store = memoryAerialStore();
    const why: string[] = [];
    const out = await aerialEvidence(C, ['swimming pool', 'tree cover'], { store, vexcel: fakeVexcel({ fail }).v, onFailure: (call, reason) => why.push(`${call}:${reason}`) });
    assert.deepEqual(out.map((e) => e.status), ['unavailable', 'unavailable'], fail);
    assert.deepEqual(why, [`detect:${fail}`, `property:${fail}`], 'the reason is reported to whoever asked, not hidden');
    assert.equal(store.rows.size + store.attrs.size, 0, `a failed call is never cached (${fail})`);
  }
});

test('a broken store does not break the caller either', async () => {
  const broken: AerialStore = {
    queries: async () => { throw new Error('db down'); }, saveQueries: async () => { throw new Error('db down'); },
    attributes: async () => { throw new Error('db down'); }, saveAttributes: async () => { throw new Error('db down'); },
  };
  const out = await aerialEvidence(C, ['swimming pool'], { store: broken, vexcel: fakeVexcel().v });
  assert.equal(out[0]!.status, 'unavailable');
});

test('the per-request budget caps Vexcel calls across communities', async () => {
  const budget = { calls: 1 };
  const { v, calls } = fakeVexcel();
  const a = await aerialEvidence(C, ['swimming pool'], { store: memoryAerialStore(), vexcel: v, budget });
  const b = await aerialEvidence({ ...C, id: '10000000-0000-4000-8000-000000000002' }, ['swimming pool'], { store: memoryAerialStore(), vexcel: v, budget });
  assert.equal(calls.detect.length, 1);
  assert.deepEqual([a[0]!.status, b[0]!.status], ['found', 'unavailable'], 'the second community is skipped, not hung');
});

test('phrases imagery cannot show are named as such and never reach Vexcel', async () => {
  const { v, calls } = fakeVexcel();
  const out = await aerialEvidence(C, ['quiet', 'good light inside'], { store: memoryAerialStore(), vexcel: v });
  assert.deepEqual(out.map((e) => e.status), ['not_checkable', 'not_checkable']);
  assert.equal(calls.detect.length + calls.property, 0);
});

test('tree cover comes from the property attributes and is cached with them', async () => {
  const store = memoryAerialStore();
  const { v, calls } = fakeVexcel();
  const out = await aerialEvidence(C, ['trees'], { store, vexcel: v });
  assert.equal(out[0]!.status, 'found');
  assert.match(out[0]!.text, /about 7% tree cover/);
  assert.equal(store.attrs.get(C.id)!.parcels, 4);
  await aerialEvidence(C, ['trees'], { store, vexcel: v });
  assert.equal(calls.property, 1, 'second time from the cache');
});

test('wording claims only what imagery shows', async () => {
  const out = await aerialEvidence(C, ['swimming pool', 'tennis court'], { store: memoryAerialStore(), vexcel: fakeVexcel().v });
  assert.equal(out[0]!.text, 'Aerial imagery suggests a swimming pool nearby (not confirmed as a resident amenity).');
  assert.match(out[1]!.text, /imagery cannot rule it out/);
  assert.equal(out[0]!.confidence, 0.70166015625);
  assert.deepEqual(out[0]!.imagery, { collection: 'us-ca-losangeles-2025', capturedAt: '2025-12-10' });
});

test('an answer with no detections is cached as a real "not seen", not treated as a failure', async () => {
  const store = memoryAerialStore();
  const out = await aerialEvidence(C, ['swimming pool'], { store, vexcel: fakeVexcel({ detect: fixture('vexcel-detect-empty.json') }).v });
  assert.equal(out[0]!.status, 'not_seen');
  assert.equal(store.rows.get(`${C.id}|80|swimming pool`)!.score, 0);
});

test('tree cover that rounds to nothing reads as "not seen", never "about 0%"', async () => {
  const store = memoryAerialStore();
  store.attrs.set(C.id, { ...parseProperty(fixture('vexcel-property.json'))!, treeCoverPct: 0.3 });
  const out = await aerialEvidence(C, ['trees'], { store });
  assert.equal(out[0]!.status, 'not_seen');
  assert.doesNotMatch(out[0]!.text, /0%/);
});
