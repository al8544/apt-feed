// Run: node --test lib/agent/ducktect.test.ts   (no model, no network, no database: an in-memory store, map and a fake Vexcel)
// Ticket T15 done-when: a prose wish returns ranked picks with evidence; each degraded mode shows a sensible message.
// The needs below are deliberately unlike each other (climbing, staying clear of nightlife, a hospital by car, outdoor space): nothing is a category.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PLACES, SHORTLIST, WEIGHTS, confirmWithSatellite, explain, interpret, newSession, rank, runRules, scout } from './ducktect.ts';
import type { RawInterpretation } from './ducktect-split.ts';
import { needs, plan, setup, spot } from './ducktect-testkit.ts';

const HARD = { maxRent: 4700, beds: 3 };
const climb = { need: 'a place to climb', why: 'climbs most evenings', source: 'profile', around: { terms: ['climbing', 'bouldering'], reach: 'walk', want: 'near' } } as const;
const quietNights = { need: 'away from late-night noise', why: 'sleeps early', source: 'profile', around: { terms: ['bar', 'nightclub'], reach: 'walk', want: 'away' } } as const;
const raw = (checks: NonNullable<RawInterpretation['checks']>, hard: RawInterpretation['hard'] = HARD): RawInterpretation => ({ hard, checks, notChecked: [] });
const homes = (n: number, rent = 4000) => Array.from({ length: n }, (_, i) => plan(i + 1, i + 1, rent, 3));
const names = (r: { picks: { community: string | null }[] }) => r.picks.map((p) => p.community);

// ---------- scout: what is around, for whatever this person's day needs ----------
test('what is around decides the shortlist: the home beside a climbing gym ranks first, with the gym named and how far it is', async () => {
  const { env } = setup(homes(4), { places: [spot('Boulder Brothers', 'climbing gym', 3, 300)] });
  const s = newSession(true);
  interpret(env, s, raw([climb]));
  const r = await rank(env, s);
  assert.equal(r.picks[0]!.community, 'Place 3');
  assert.match(r.picks[0]!.evidence[0]!.text, /^Boulder Brothers \(climbing gym\) is about (300|350) m away, a (4|5)-minute walk\.$/);
  assert.equal(r.picks[0]!.criteria.find((c) => c.key === 'around: a place to climb')!.ok, true);
  assert.equal(r.picks[1]!.criteria.find((c) => c.key === 'around: a place to climb')!.ok, null, 'not finding one is unknown, not a fail: the map is incomplete');
  assert.equal(r.surroundings, 'ok');
});

test('a need to stay AWAY from something works the other way: finding it near is the bad news', async () => {
  const { env } = setup(homes(3), { places: [spot('Neon Lounge', 'nightclub', 1, 150)] });
  const s = newSession(true);
  interpret(env, s, raw([quietNights]));
  const r = await rank(env, s);
  const crit = (c: string) => r.picks.find((p) => p.community === c)!.criteria.find((x) => x.key === 'around: away from late-night noise')!;
  assert.equal(crit('Place 1').ok, false);
  assert.equal(crit('Place 2').ok, true);
  assert.equal(r.picks.at(-1)!.community, 'Place 1', 'the home next to the club ranks last');
  const foundAt150 = WEIGHTS.foundFloor + (WEIGHTS.found - WEIGHTS.foundFloor) * (1 - 150 / 800);
  assert.ok(Math.abs(r.picks[0]!.score - r.picks.at(-1)!.score - (WEIGHTS.awayClear + foundAt150)) < 0.01);
});

test('how far "around" reaches is the need\'s own: a hospital counts by car, not on foot', async () => {
  const hospital = [spot('County Hospital', 'hospital', 1, 4000)];
  const drive = setup(homes(2), { places: hospital });
  const sd = newSession(true);
  interpret(drive.env, sd, raw([{ need: 'a hospital close by', around: { terms: ['hospital'], reach: 'drive', want: 'near' } }]));
  assert.equal((await rank(drive.env, sd)).picks.find((p) => p.community === 'Place 1')!.evidence[0]!.status, 'found');
  const walk = setup(homes(2), { places: hospital });
  const sw = newSession(true);
  interpret(walk.env, sw, raw([{ need: 'a hospital close by', around: { terms: ['hospital'], reach: 'walk', want: 'near' } }]));
  assert.equal((await rank(walk.env, sw)).picks.find((p) => p.community === 'Place 1')!.evidence[0]!.status, 'not_seen');
});

test('"hospital" without the vets: the model says what must not match, and the home by an animal hospital is not credited', async () => {
  const places = [spot('Paws Animal Hospital', 'veterinary', 1, 200), spot('County General Hospital', 'hospital', 2, 200)];
  const withoutVets = setup(homes(2), { places });
  const s = newSession(true);
  interpret(withoutVets.env, s, raw([{ need: 'a hospital close by', around: { terms: ['hospital'], without: ['veterinary', 'animal'], reach: 'walk', want: 'near' } }]));
  const r = await rank(withoutVets.env, s);
  assert.equal(r.picks[0]!.community, 'Place 2');
  assert.equal(r.picks.find((p) => p.community === 'Place 1')!.evidence[0]!.status, 'not_seen');
  const loose = setup(homes(2), { places });
  const s2 = newSession(true);
  interpret(loose.env, s2, raw([{ need: 'a hospital close by', around: { terms: ['hospital'], reach: 'walk', want: 'near' } }]));
  assert.equal((await rank(loose.env, s2)).picks.find((p) => p.community === 'Place 1')!.evidence[0]!.status, 'found', 'without saying so, the vet counts: that is why the model is told to');
});

test('any words work: the terms are matched against what places are called and what they are', async () => {
  const { env } = setup(homes(2), { places: [spot('Green Table', 'restaurant', 2, 100, 'vegan vegetarian'), spot('Steak Barn', 'restaurant', 1, 100)] });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'vegan food', around: { terms: ['vegan'], reach: 'walk', want: 'near' } }]));
  const r = await rank(env, s);
  assert.equal(r.picks[0]!.community, 'Place 2');
  assert.match(r.picks[0]!.evidence[0]!.text, /^Green Table \(restaurant\)/);
});

test('it never looks at more than the shortlist from above, and the shortlist is chosen by what is around, not by rent', async () => {
  const many = homes(30, 4000).map((p, i) => ({ ...p, rentMin: 4000 - i })); // the highest-numbered homes are the cheapest
  const { env, vx } = setup(many, { places: [spot('Boulder Brothers', 'climbing gym', 1, 100)], found: { 'swimming pool': [1] } });
  const s = newSession(true);
  interpret(env, s, raw([{ ...climb, imagery: ['swimming pool'] }]));
  const r = await rank(env, s);
  assert.equal(r.checked, 30, 'every candidate\'s surroundings were examined');
  assert.equal(r.shortlisted, SHORTLIST);
  assert.equal(vx.calls.detect, SHORTLIST, 'Vexcel was asked about the shortlist and no more');
  assert.equal(r.picks[0]!.community, 'Place 1', 'the home by the gym made the shortlist although it is the dearest');
});

// ---------- confirm: the satellite re-affirms the shortlist ----------
test('the satellite re-affirms: a home with both the gym and the pool outranks one with only the gym', async () => {
  const { env } = setup(homes(3), { places: [spot('Boulder Brothers', 'climbing gym', 1, 100), spot('Wall Works', 'climbing gym', 2, 100)], found: { 'swimming pool': [2] } });
  const s = newSession(true);
  interpret(env, s, raw([{ ...climb, imagery: ['swimming pool'] }]));
  const r = await rank(env, s);
  assert.deepEqual(names(r).slice(0, 2), ['Place 2', 'Place 1']);
  assert.equal(r.picks[0]!.score - r.picks[1]!.score, WEIGHTS.found - WEIGHTS.notSeen);
  assert.match(r.picks[0]!.criteria.find((c) => c.key === 'satellite: swimming pool')!.detail, /not confirmed as a resident amenity/);
});

test('any visible thing can be asked for from above, in one detector call for all the labels', async () => {
  const { env, vx } = setup(homes(2), { found: { 'solar panels': [1], 'basketball court': [] } });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'solar', imagery: ['solar panels'] }, { need: 'hoops', imagery: ['basketball courts'] }]));
  const r = await rank(env, s);
  assert.deepEqual(vx.calls.labels[0], ['solar panels', 'basketball court'], 'aliases tidied, one call per place');
  assert.equal(r.picks[0]!.community, 'Place 1');
});

test('a label that no shortlisted place showed is flagged as unverified and not used to rank', async () => {
  const { env } = setup(homes(5), { found: {} });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'a skate park', imagery: ['skate park'] }]));
  const r = await rank(env, s);
  assert.deepEqual(r.unverified, ['skate park']);
  assert.ok(r.picks.every((p) => p.score === r.picks[0]!.score), 'no penalty: nobody was marked down for the detector not knowing the word');
});

test('a label shown at nearly every shortlisted place does not tell them apart, so it is flagged and not used to rank', async () => {
  const { env } = setup(homes(5), { found: { 'green space': [1, 2, 3, 4, 5] } });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'green', imagery: ['green space'] }]));
  const r = await rank(env, s);
  assert.deepEqual(r.undistinguishing, ['green space']);
  assert.deepEqual(r.unverified, []);
  assert.ok(r.picks.every((p) => p.score === r.picks[0]!.score));
});

test('closer is better: of two homes with the gym in reach, the nearer one ranks higher, by the documented weights', async () => {
  const { env } = setup(homes(2), { places: [spot('Near Wall', 'climbing gym', 1, 100), spot('Far Wall', 'climbing gym', 2, 700)] });
  const s = newSession(true);
  interpret(env, s, raw([climb]));
  const r = await rank(env, s);
  assert.equal(r.picks[0]!.community, 'Place 1');
  const gap = r.picks[0]!.score - r.picks[1]!.score;
  assert.ok(gap > 0 && gap < WEIGHTS.found - WEIGHTS.foundFloor, `a small, distance-sized gap (${gap.toFixed(1)})`);
  assert.equal(r.picks[0]!.evidence[0]!.meters, 100);
});

test('a need met almost everywhere at the chosen reach is narrowed until it tells places apart, and says so', async () => {
  // 25 homes 220 m apart (a 5 km strip) with one hospital at the north end: all are within a drive of it, only the nearest ~11 within a bike ride.
  const strip = Array.from({ length: 25 }, (_, i) => plan(i + 1, i + 1, 4000, 3, { lat: 34 + i * 0.002 }));
  const { env } = setup(strip, { places: [{ id: 'node/h', name: 'North Hospital', kind: 'hospital', areaM2: null, closed: false, pts: [[34.049, -118.3]] }] });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'quick to a hospital', around: { terms: ['hospital'], reach: 'drive', want: 'near' } }]));
  const r = await rank(env, s);
  assert.deepEqual(r.tightened, [{ need: 'quick to a hospital', from: 'drive', to: 'bike' }]);
  assert.equal(r.picks[0]!.community, 'Place 25', 'the home nearest the hospital ranks first');
  assert.deepEqual(r.undistinguishing, []);
});

test('a need that nearly every home meets (a church within a walk, anywhere) is shown but not ranked on', async () => {
  const everywhere = Array.from({ length: 25 }, (_, i) => spot(`Church ${i}`, 'place of worship', i + 1, 100));
  const { env } = setup(homes(25), { places: [...everywhere, spot('Boulder Brothers', 'climbing gym', 4, 100)] });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'calm', around: { terms: ['church', 'worship'], reach: 'walk', want: 'near' } }, climb]));
  const r = await rank(env, s);
  assert.deepEqual(r.undistinguishing, ['calm']);
  assert.equal(r.picks[0]!.community, 'Place 4', 'only the need that tells homes apart decides');
  assert.ok(r.picks[0]!.criteria.some((c) => c.key === 'around: calm' && c.ok === true), 'it is still shown');
});

test('a label the satellite does show somewhere is trusted, and its absences count a little', async () => {
  const { env } = setup(homes(5), { found: { 'solar panels': [2] } });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'solar', imagery: ['solar panels'] }]));
  const r = await rank(env, s);
  assert.deepEqual(r.unverified, []);
  assert.equal(r.picks[0]!.community, 'Place 2');
});

// ---------- the degraded modes (§8.9) ----------
test('map data down: still ranked on the listing and the satellite, and it says so', async () => {
  const { env } = setup(homes(3), { noPlaces: true, found: { 'swimming pool': [2] } });
  const s = newSession(true);
  interpret(env, s, raw([{ ...climb, imagery: ['swimming pool'] }]));
  const r = await rank(env, s);
  assert.equal(r.surroundings, 'unavailable');
  assert.equal(r.picks[0]!.community, 'Place 2', 'the satellite still decides');
  assert.equal(r.picks[0]!.evidence[0]!.status, 'unavailable');
});

test('Vexcel down: the surroundings still shortlist and rank, and the aerial lines say unavailable, with the reason reported', async () => {
  for (const fail of ['forbidden', 'network'] as const) {
    const { env } = setup(homes(3), { fail, places: [spot('Boulder Brothers', 'climbing gym', 2, 100)] });
    const why: string[] = [];
    env.onFailure = (r) => why.push(r);
    const s = newSession(true);
    interpret(env, s, raw([{ ...climb, imagery: ['swimming pool'] }]));
    const r = await rank(env, s);
    assert.equal(r.aerial, 'unavailable', fail);
    assert.equal(r.surroundings, 'ok');
    assert.equal(r.picks[0]!.community, 'Place 2');
    assert.ok(r.picks.every((p) => p.evidence.filter((e) => e.phrase === 'swimming pool').every((e) => e.status === 'unavailable')));
    assert.ok(why.includes(fail));
  }
});

test('no key and an empty cache behaves the same: the wish is answered without the satellite', async () => {
  const { env } = setup(homes(1), { noVexcel: true });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'a pool', imagery: ['swimming pool'] }]));
  const r = await rank(env, s);
  assert.equal(r.aerial, 'unavailable');
  assert.equal(r.picks.length, 1);
});

test('some shortlisted places unavailable (budget used up) is "partial", not a failure', async () => {
  const { env } = setup(homes(3), { found: { 'swimming pool': [1] }, budget: 1 });
  const s = newSession(true);
  interpret(env, s, raw([{ need: 'a pool', imagery: ['swimming pool'] }]));
  const r = await rank(env, s);
  assert.equal(r.aerial, 'partial');
  assert.equal(r.aerialPlaces, 1);
});

test('nothing to look around for or confirm from above: both are skipped, and neither the map nor Vexcel is touched', async () => {
  const { env, vx } = setup(homes(2), { places: [spot('Boulder Brothers', 'climbing gym', 1, 100)] });
  const s = newSession(true);
  interpret(env, s, { hard: HARD, checks: [], notChecked: ['quiet'] });
  const r = await rank(env, s);
  assert.deepEqual([r.surroundings, r.aerial], ['skipped', 'skipped']);
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

// ---------- the listing facts ----------
test('bathrooms and size are hard filters too; an unknown size is not "too small"', async () => {
  const { env } = setup([plan(1, 1, 3000, 3, { baths: 1 }), plan(2, 2, 3000, 3, { baths: 2, sqft: 700 }), plan(3, 3, 3000, 3, { baths: 2, sqft: null }), plan(4, 4, 3000, 3, { baths: 2, sqft: 1200 })]);
  const s = newSession(true);
  interpret(env, s, { hard: { ...HARD, minBaths: 2, minSqft: 1000 }, checks: [], notChecked: [] });
  assert.deepEqual(names(await rank(env, s)).sort(), ['Place 3', 'Place 4']);
});

test('one place is one candidate: its best plan, not three rows of the same building', async () => {
  const { env } = setup([plan(1, 1, 4400, 3), plan(2, 1, 3900, 3), plan(3, 1, 4100, 3), plan(4, 2, 4000, 3)]);
  const r = await runRules(env, newSession(false), '3 bed under $4,700');
  assert.equal(r.picks.length, 2);
  assert.equal(r.picks.find((p) => p.community === 'Place 1')!.rentFrom, 3900, 'the lower rent wins when everything else ties');
  assert.equal(r.considered, 2);
});

test('a plan with more bedrooms than asked ranks below an exact match, by the documented weight', async () => {
  const { env } = setup([plan(1, 1, 3000, 6), plan(2, 2, 3000, 3)]);
  const r = await runRules(env, newSession(false), '3 bed under $4,700');
  assert.deepEqual(r.picks.map((p) => p.beds), [3, 6]);
  assert.equal(r.picks[0]!.score - r.picks[1]!.score, -WEIGHTS.extraBed * 3);
});

test('every pick carries each hard check, each need, and the wishes nobody can check, and is placed in a named area', async () => {
  const { env } = setup([plan(1, 1, 4000, 3, { lat: 34.0872, lng: -118.2705 })], { places: [spot('Boulder Brothers', 'climbing gym', 1, 100)], found: { 'swimming pool': [] } });
  const s = newSession(true);
  interpret(env, s, { hard: HARD, checks: [{ need: 'a place to climb', around: { terms: ['climbing'] }, imagery: ['swimming pool'] }], notChecked: ['sunny'] });
  const r = await rank(env, s);
  const keys = r.picks[0]!.criteria.map((c) => c.key);
  for (const k of ['budget', 'beds', 'around: a place to climb', 'satellite: swimming pool', 'not checked: sunny']) assert.ok(keys.includes(k), k);
  assert.equal(r.picks[0]!.criteria.find((c) => c.key === 'not checked: sunny')!.ok, null);
});

// ---------- scope rules (§8.9) ----------
test('a place named in the wish overrides the map; without one the map is the area', async () => {
  const inSilverLake = plan(1, 1, 4000, 3, { lat: 34.087, lng: -118.27 });
  const farAway = plan(2, 2, 4000, 3, { lat: 33.99, lng: -118.47 }); // Venice
  const map = { south: 33.9, north: 34.2, west: -118.6, east: -118.1 };
  const named = await runRules(setup([inSilverLake, farAway], { viewport: map }).env, newSession(false), '3 bed in Silver Lake under $4,700');
  assert.deepEqual(names(named), ['Place 1']);
  assert.deepEqual(named.area!.names, ['Silver Lake']);
  assert.equal(named.picks[0]!.area, 'Silver Lake');
  const unnamed = await runRules(setup([inSilverLake, farAway], { viewport: { south: 33.95, north: 34.0, west: -118.5, east: -118.4 } }).env, newSession(false), '3 bed under $4,700');
  assert.deepEqual(names(unnamed), ['Place 2']);
  assert.equal(unnamed.area, null);
});

test('solo mode: with no flock the wish and your own profile are the flock of one', async () => {
  const { env } = setup([plan(1, 1, 1400, 2)], { needs: needs(1500) });
  const r = await runRules(env, newSession(false), '2 bed');
  assert.equal(r.solo, true);
  assert.equal(r.picks[0]!.criteria.find((c) => c.key === 'budget')!.ok, true);
});

test('no budget anywhere: the budget check is unknown, not a fail on every place', async () => {
  const { env } = setup([plan(1, 1, 9000, 2)], { needs: needs(null) });
  const r = await runRules(env, newSession(false), '2 bed');
  assert.deepEqual(r.picks[0]!.criteria.find((c) => c.key === 'budget'), { key: 'budget', ok: null, detail: 'no budget given' });
});

test('the map filters fill what the wish leaves unsaid, and the wish wins where it speaks', async () => {
  const { env } = setup([plan(1, 1, 2000, 2), plan(2, 2, 4500, 3)], { defaults: { maxRent: 3000, beds: 2 } });
  const s = newSession(false);
  assert.deepEqual(interpret(env, s, 'a pool').hard, { areas: [], maxRent: 3000, beds: 2 });
  assert.deepEqual(interpret(env, s, '3 bed under $5,000').hard, { areas: [], maxRent: 5000, beds: 3 });
});

test('whichever order the steps run in, the answer is the same, and asking twice is free', async () => {
  const { env, vx } = setup(homes(2), { places: [spot('Boulder Brothers', 'climbing gym', 1, 100)], found: { 'swimming pool': [1] } });
  const s = newSession(true);
  interpret(env, s, raw([{ ...climb, imagery: ['pool'] }]));
  const first = await rank(env, s); // straight to rank: it runs the steps before it
  assert.equal(await rank(env, s), first);
  await scout(env, s);
  await confirmWithSatellite(env, s);
  assert.equal(vx.calls.detect, 2);
  assert.equal(first.viaModel, true);
});

test('it can look around at most MAX_PLACES homes, and says how many it examined', async () => {
  const { env } = setup(homes(MAX_PLACES + 20), { places: [spot('Boulder Brothers', 'climbing gym', 1, 100)] });
  const s = newSession(true);
  interpret(env, s, raw([climb]));
  const r = await rank(env, s);
  assert.equal(r.checked, MAX_PLACES);
  assert.equal(r.considered, MAX_PLACES + 20);
});

// ---------- explain: the model's rationale, held to the facts ----------
test('the rationale is attached to the picks, and anything with a number that is not in the result is dropped', async () => {
  const { env } = setup(homes(2), { places: [spot('Boulder Brothers', 'climbing gym', 2, 300)] });
  const s = newSession(true);
  interpret(env, s, raw([climb]));
  const r = await rank(env, s);
  const out = explain(s, {
    dailyLife: 'Assuming you climb most evenings, a short walk home matters more than a big living room.',
    picks: [
      { rank: 1, why: 'Boulder Brothers is a short walk away, so your evening session fits around work.', tradeOff: 'Rent is $9,999 more than any other option.' },
      { rank: 2, why: 'A 92% match for your lifestyle.' },
      { rank: 9, why: 'There is no ninth pick.' },
    ],
  });
  assert.equal(r.picks[0]!.why, 'Boulder Brothers is a short walk away, so your evening session fits around work.');
  assert.equal(r.picks[0]!.tradeOff, undefined, 'a made-up rent is dropped');
  assert.equal(r.picks[1]!.why, undefined, 'a made-up percentage is dropped');
  assert.match(r.dailyLife!, /^Assuming you climb/);
  assert.equal(out.accepted, 1);
  assert.deepEqual(out.dropped.sort(), ['rank 9', 'tradeOff #1', 'why #2']);
});

test('a number that IS in the result may be quoted', async () => {
  const { env } = setup(homes(1), { places: [spot('Boulder Brothers', 'climbing gym', 1, 300)] });
  const s = newSession(true);
  interpret(env, s, raw([climb]));
  const r = await rank(env, s);
  explain(s, { picks: [{ rank: 1, why: `It starts at $${r.picks[0]!.rentFrom.toLocaleString('en-US')}, inside your budget.` }] });
  assert.match(r.picks[0]!.why!, /starts at \$4,000/);
});

test('explaining before ranking is refused, and explaining a wish with no result changes nothing', () => {
  const out = explain(newSession(true), { dailyLife: 'x', picks: [] });
  assert.deepEqual(out, { accepted: 0, dropped: ['no result yet'] });
});

// ---------- read-only, and the weights ----------
test('it is read-only: a full run saves, invites and records nothing', async () => {
  const { env, store } = setup(homes(1), { flock: true, places: [spot('Boulder Brothers', 'climbing gym', 1, 100)], found: { 'swimming pool': [1] } });
  const s = newSession(true);
  interpret(env, s, raw([{ ...climb, imagery: ['swimming pool'] }]));
  explain(s, { picks: [{ rank: (await rank(env, s)).picks[0]!.rank, why: 'It is next to the gym.' }] });
  assert.equal(store.saved.size + store.invited.length + store.feedback.length, 0);
});

test('the weights are ordered so that a hard pass always beats any amount of evidence', () => {
  assert.ok(WEIGHTS.pass > 100 + WEIGHTS.found * 8, 'pass outweighs a perfect fit plus evidence for several needs');
  assert.ok(WEIGHTS.notSeen < 0 && WEIGHTS.notSeen > -WEIGHTS.found, 'absence nudges down a little; the map and imagery are incomplete');
  assert.ok(WEIGHTS.awayClear > 0 && WEIGHTS.awayClear < WEIGHTS.found);
});
