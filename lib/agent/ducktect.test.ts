// Run: node --test lib/agent/ducktect.test.ts   (no model, no network, no database: an in-memory store and a fake Vexcel)
// Ticket T15 done-when: a prose wish returns ranked picks with evidence; each degraded mode shows a sensible message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_CAP, WEIGHTS, interpret, newSession, rank, runRules } from './ducktect.ts';
import { needs, plan, setup } from './ducktect-testkit.ts';

test('a wish returns ranked picks, and a place with a pool in the imagery outranks an equal place without one', async () => {
  const { env } = setup([plan(1, 1, 4000, 3), plan(2, 2, 4000, 3), plan(3, 3, 4000, 3)], { withPool: [2] });
  const r = await runRules(env, newSession(false), 'sunny 3 bed with a pool, under $4,700');
  assert.equal(r.picks[0]!.community, 'Place 2', 'the place with the pool comes first');
  assert.deepEqual(r.picks.slice(1).map((p) => p.community).sort(), ['Place 1', 'Place 3']);
  assert.equal(r.picks[0]!.rank, 1);
  assert.equal(r.picks[0]!.score - r.picks[1]!.score, WEIGHTS.found - WEIGHTS.notSeen, 'the gap is exactly the documented weights');
  assert.equal(r.picks[0]!.evidence[0]!.status, 'found');
  assert.match(r.picks[0]!.evidence[0]!.text, /not confirmed as a resident amenity/);
});

test('every pick carries each hard check, each visual phrase asked for, and the wishes nobody can check', async () => {
  const { env } = setup([plan(1, 1, 4000, 3)], { withPool: [1] });
  const r = await runRules(env, newSession(false), 'sunny 3 bed with a pool and trees near a park, under 4,700');
  const keys = r.picks[0]!.criteria.map((c) => c.key);
  assert.ok(keys.includes('budget') && keys.includes('beds'));
  assert.ok(keys.includes('aerial: swimming pool') && keys.includes('aerial: tree cover'));
  assert.ok(keys.includes('not checked: sunny') && keys.includes('not checked: park nearby'));
  assert.equal(r.picks[0]!.criteria.find((c) => c.key === 'not checked: sunny')!.ok, null);
  assert.deepEqual(r.interpreted.notChecked, ['sunny', 'park nearby']);
});

test('one place is one candidate: its best plan, not three rows of the same building', async () => {
  const { env } = setup([plan(1, 1, 4400, 3), plan(2, 1, 3900, 3), plan(3, 1, 4100, 3), plan(4, 2, 4000, 3)]);
  const r = await runRules(env, newSession(false), '3 bed under $4,700');
  assert.equal(r.picks.length, 2);
  assert.equal(r.picks.find((p) => p.community === 'Place 1')!.rentFrom, 3900, 'the lower rent wins when everything else ties');
  assert.equal(r.considered, 2);
});

test('the cap is stated, not hidden: "checked 25 of N"', async () => {
  const many = Array.from({ length: 40 }, (_, i) => plan(i + 1, i + 1, 3000 + i, 3));
  const { env, vx } = setup(many);
  const r = await runRules(env, newSession(false), '3 bed under $4,700 with a pool');
  assert.equal(r.considered, 40);
  assert.equal(r.checked, CANDIDATE_CAP);
  assert.equal(vx.calls.detect, CANDIDATE_CAP, 'Vexcel was asked about 25 places and no more');
  assert.equal(r.picks.length, 5);
  assert.equal(r.alsoConsidered.length, 3);
});

// ---------- the degraded modes (§8.9) ----------
test('Vexcel down: still ranked on kit data, every aerial line says unavailable, and the reason is reported', async () => {
  for (const fail of ['forbidden', 'network'] as const) {
    const { env } = setup([plan(1, 1, 4000, 3), plan(2, 2, 3000, 3)], { fail });
    const why: string[] = [];
    env.onFailure = (r) => why.push(r);
    const r = await runRules(env, newSession(false), '3 bed with a pool under $4,700');
    assert.equal(r.aerial, 'unavailable', fail);
    assert.equal(r.picks.length, 2, 'the kit data still ranks');
    assert.ok(r.picks.every((p) => p.evidence.every((e) => e.status === 'unavailable' && e.text === 'Aerial check unavailable.')));
    assert.ok(why.includes(fail));
  }
});

test('no key and an empty cache behaves the same: the wish is answered without aerial', async () => {
  const { env } = setup([plan(1, 1, 4000, 3)], { noVexcel: true });
  const r = await runRules(env, newSession(false), '3 bed with a pool under $4,700');
  assert.equal(r.aerial, 'unavailable');
  assert.equal(r.picks.length, 1);
});

test('some places unavailable (budget used up) is "partial", not a failure', async () => {
  const { env } = setup([plan(1, 1, 4000, 3), plan(2, 2, 4000, 3), plan(3, 3, 4000, 3)], { withPool: [1], budget: 1 });
  const r = await runRules(env, newSession(false), '3 bed with a pool under $4,700');
  assert.equal(r.aerial, 'partial');
  assert.equal(r.picks.length, 3);
  assert.equal(r.aerialPlaces, 1, 'the result says how many places the aerial check really covered');
});

test('a plan with more bedrooms than asked ranks below an exact match, by the documented weight', async () => {
  const { env } = setup([plan(1, 1, 3000, 6), plan(2, 2, 3000, 3)]);
  const r = await runRules(env, newSession(false), '3 bed under $4,700');
  assert.deepEqual(r.picks.map((p) => p.beds), [3, 6]);
  assert.equal(r.picks[0]!.score - r.picks[1]!.score, -WEIGHTS.extraBed * 3, 'three extra bedrooms, three times the penalty');
});

test('no visual phrase in the wish: the aerial step is skipped entirely', async () => {
  const { env, vx } = setup([plan(1, 1, 4000, 3)]);
  const r = await runRules(env, newSession(false), '3 bed under $4,700, quiet');
  assert.equal(r.aerial, 'skipped');
  assert.equal(vx.calls.detect + vx.calls.property, 0);
  assert.deepEqual(r.interpreted.notChecked, ['quiet']);
});

test('nothing matches: it names the constraint that did it, with what dropping each would give', async () => {
  const { env } = setup([plan(1, 1, 3000, 3), plan(2, 2, 3200, 3), plan(3, 3, 2800, 2)]);
  const r = await runRules(env, newSession(false), '3 bed under $1,000');
  assert.deepEqual(r.picks, []);
  assert.deepEqual(r.noResults!.constraints.map((c) => [c.key, c.ifRelaxed]), [['rent', 2], ['beds', 0]], 'dropping the rent limit gives 2 places; dropping the bedrooms still gives none');
  assert.match(r.noResults!.constraints[0]!.detail, /under \$1,000/);
});

// ---------- scope rules (§8.9) ----------
test('a place named in the wish overrides the map; without one the map is the area', async () => {
  const inSilverLake = plan(1, 1, 4000, 3, { lat: 34.087, lng: -118.27 });
  const farAway = plan(2, 2, 4000, 3, { lat: 33.99, lng: -118.47 }); // Venice
  const map = { south: 33.9, north: 34.2, west: -118.6, east: -118.1 };
  const named = await runRules(setup([inSilverLake, farAway], { viewport: map }).env, newSession(false), '3 bed in Silver Lake under $4,700');
  assert.deepEqual(named.picks.map((p) => p.community), ['Place 1']);
  assert.deepEqual(named.area!.names, ['Silver Lake'], 'the map should move there');
  const unnamed = await runRules(setup([inSilverLake, farAway], { viewport: { south: 33.95, north: 34.0, west: -118.5, east: -118.4 } }).env, newSession(false), '3 bed under $4,700');
  assert.deepEqual(unnamed.picks.map((p) => p.community), ['Place 2'], 'the viewport is the area when no place is named');
  assert.equal(unnamed.area, null);
});

test('solo mode: with no flock the wish and your own profile are the flock of one', async () => {
  const { env } = setup([plan(1, 1, 1400, 2)], { needs: needs(1500) });
  const r = await runRules(env, newSession(false), '2 bed');
  assert.equal(r.solo, true);
  assert.equal(r.picks[0]!.criteria.find((c) => c.key === 'budget')!.ok, true, "the profile's budget is used when the wish names none");
});

test('no budget anywhere: the budget check is unknown, not a fail on every place', async () => {
  const { env } = setup([plan(1, 1, 9000, 2)], { needs: needs(null) });
  const r = await runRules(env, newSession(false), '2 bed');
  assert.equal(r.picks.length, 1);
  assert.deepEqual(r.picks[0]!.criteria.find((c) => c.key === 'budget'), { key: 'budget', ok: null, detail: 'no budget given' });
});

test('the map filters fill what the wish leaves unsaid, and the wish wins where it speaks', async () => {
  const { env } = setup([plan(1, 1, 2000, 2), plan(2, 2, 4500, 3)], { defaults: { maxRent: 3000, beds: 2 } });
  const s = newSession(false);
  assert.deepEqual(interpret(env, s, 'a pool').hard, { areas: [], maxRent: 3000, beds: 2 });
  assert.deepEqual(interpret(env, s, '3 bed under $5,000').hard, { areas: [], maxRent: 5000, beds: 3 });
});

test('whichever order the steps run in, the answer is the same, and asking twice is free', async () => {
  const { env, vx } = setup([plan(1, 1, 4000, 3)], { withPool: [1] });
  const s = newSession(true);
  interpret(env, s, { hard: { maxRent: 4700, beds: 3 }, visual: ['pool'] });
  const first = await rank(env, s); // straight to rank: it runs the steps before it
  const again = await rank(env, s);
  assert.equal(first, again);
  assert.equal(vx.calls.detect, 1);
  assert.equal(first.viaModel, true);
});

test('it is read-only: a full run saves, invites and records nothing', async () => {
  const { env, store } = setup([plan(1, 1, 4000, 3)], { withPool: [1], flock: true });
  await runRules(env, newSession(false), '3 bed with a pool');
  assert.equal(store.saved.size + store.invited.length + store.feedback.length, 0);
});

test('the weights are ordered so that a hard pass always beats any amount of evidence', () => {
  assert.ok(WEIGHTS.pass > 100 + WEIGHTS.found * 4, 'pass outweighs a perfect fit plus evidence for every phrase we can check');
  assert.ok(WEIGHTS.notSeen < 0 && WEIGHTS.notSeen > -WEIGHTS.found, 'absence nudges down a little; imagery cannot rule a place out');
});

test('when more places match than the cap, the ones closest to the bedrooms asked fill it first', async () => {
  // 30 cheap six-bedroom places and 5 dearer exact three-bedroom ones: a cheapest-first cap would never look at the 3-bedrooms.
  const sixes = Array.from({ length: 30 }, (_, i) => plan(i + 1, i + 1, 1000 + i, 6));
  const threes = Array.from({ length: 5 }, (_, i) => plan(100 + i, 100 + i, 4000 + i, 3));
  const r = await runRules(setup([...sixes, ...threes]).env, newSession(false), '3 bed under $4,700');
  assert.equal(r.checked, CANDIDATE_CAP);
  assert.equal(r.picks.filter((p) => p.beds === 3).length, 5, 'all five exact matches are in the result');
});
