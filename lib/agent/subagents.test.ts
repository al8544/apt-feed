// Run: node --test lib/agent/subagents.test.ts
// T13 fixtures: three profiles and ten floor plans with a known right answer. The agent graph runs with a scripted fake model (no key,
// no network, no database), so these check OUR wiring and rules: what gets saved, what is refused, and how a thumbs-down reason
// changes the next shortlist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIMessage } from '@langchain/core/messages';
import { fakeModel } from '@langchain/core/testing';
import { MemorySaver } from '@langchain/langgraph';
import { rerunShortlist } from './feedback.ts';
import { createFlockAgent, threadId } from './flock-agent.ts';
import { feedbackInput, type AgentEvent } from './schemas.ts';
import { memoryStore, supabaseStore, type Plan } from './store.ts';
import { toEvents } from './stream.ts';

const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const P = (n: number) => `10000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const FLOCK = U(9);

// Three people: shares of $1,700 + $1,600 + $1,400 = a combined $4,700, and three bedrooms.
const members = [[1, 1700], [2, 1600], [3, 1400]].map(([n, b]) => ({ userId: U(n!), status: 'active' as const, budgetMax: b! }));
const plan = (n: number, rent: number, beds: number, community: string, sqft: number, pets: boolean | null): Plan =>
  ({ id: P(n), address: `${n} Fixture St`, rentMin: rent, rentMax: null, beds, baths: 2, sqft, pets, neighborhood: '', communityName: community });
// Ten floor plans. Passing (3 bd, at most $4,700): 1, 8, 2, 9, 3, 4 in rent order. Out: 5 and 7 (over budget), 6 and 10 (too few bedrooms).
const plans = () => [
  plan(1, 3900, 3, 'A', 1000, null), plan(2, 4200, 3, 'B', 1200, true), plan(3, 4500, 3, 'C', 1400, false), plan(4, 4650, 3, 'D', 1300, null),
  plan(5, 4900, 3, 'E', 1250, true), plan(6, 2800, 2, 'F', 900, true), plan(7, 5600, 4, 'G', 1800, true), plan(8, 4100, 3, 'A', 1050, null),
  plan(9, 4300, 3, 'H', 1500, true), plan(10, 2000, 1, 'I', 600, null),
];
const seed = (bedroomsNeeded: number | null = 3, miles?: Record<string, number>) => memoryStore({ miles, plans: plans(), needs: { size: 3, members, bedroomsNeeded, areas: [], needsPets: false, dealbreakers: [] } });
const ids = (store: { saved: Map<string, unknown> }) => [...store.saved.keys()].sort();
const sorted = (...ns: number[]) => ns.map(P).sort();

async function collect(source: AsyncIterable<[string, unknown]>) {
  const events: AgentEvent[] = [];
  for await (const [mode, data] of source) events.push(...toEvents(mode, data));
  return events;
}
const cfg = { streamMode: ['updates', 'messages'], context: { userId: U(1), flockId: FLOCK }, configurable: { thread_id: threadId(FLOCK, U(1)) } } as never;

test('the demo wish: update_shortlist is called, over-budget and too-small plans are refused, the cheapest passing plan is on top', async () => {
  const store = seed();
  const model = fakeModel()
    .respondWithTools([{ name: 'task', args: { description: '3 bedrooms under $4,700 combined', subagent_type: 'apartment-searcher' } }])
    .respondWithTools([{ name: 'search_apartments', args: { maxRent: 4700, beds: 3 } }])
    .respondWithTools([{ name: 'rank_apartments', args: { listingIds: [1, 8, 2, 9, 3, 4, 5, 6].map(P) } }])
    .respond(new AIMessage('ranked'))
    .respondWithTools([{ name: 'update_shortlist', args: { picks: [1, 8, 2, 5, 6].map((n) => ({ listingId: P(n) })) } }]) // 5 is over budget, 6 has 2 bedrooms
    .respond(new AIMessage('Saved.'));
  const agent = createFlockAgent({ store, model: model as never, saver: new MemorySaver() });
  const events = await collect((await agent.stream({ messages: [{ role: 'user', content: 'We need 3 bedrooms under $4,700' }] }, cfg)) as AsyncIterable<[string, unknown]>);

  const call = events.find((e) => e.type === 'tool_result' && e.name === 'update_shortlist');
  assert.ok(call, 'update_shortlist was called');
  assert.deepEqual(ids(store), sorted(1, 2, 8), 'only passing plans are saved');
  const result = call.type === 'tool_result' ? JSON.parse(call.content) : {};
  assert.deepEqual(result.savedIds, [P(1), P(8), P(2)], 'saved in the order given: the cheapest passing plan (1) is the top pick');
  assert.deepEqual(result.rejected.map((r: { listingId: string }) => r.listingId).sort(), sorted(5, 6), 'the exclusions are named');
  assert.ok(events.some((e) => e.type === 'step' && e.name === 'apartment-searcher'));
});

test('a thumbs-down reason visibly changes the next shortlist', async () => {
  // Each case: [plan rejected, reason, expected shortlist after the rerun]
  const cases: [number, string, number[]][] = [
    [2, 'too expensive', [1, 8]], // nothing at or above $4,200 any more
    [1, 'too small', [8, 2, 9, 3, 4]], // nothing at or below 1,000 sqft
    [1, 'too far', [2, 9, 3, 4]], // community A (plans 1 and 8) is out
    [3, 'no pets', [2, 9, 1, 8, 4]], // plan 3 bans pets, so plans known to allow them go first
    [4, 'bad photos', [1, 8, 2, 9, 3]], // only that plan is out
  ];
  for (const [n, reason, expected] of cases) {
    const store = seed();
    const before = await rerunShortlist(store, FLOCK);
    assert.deepEqual(before.savedIds, [1, 8, 2, 9, 3].map(P), 'the first shortlist: the five cheapest passing plans');
    await store.recordFeedback(FLOCK, U(1), P(n), reason);
    const after = await rerunShortlist(store, FLOCK);
    assert.deepEqual(after.savedIds, expected.map(P), `${reason} on plan ${n}`);
    assert.deepEqual(ids(store), sorted(...expected), `${reason}: earlier picks that no longer qualify are removed`);
    assert.deepEqual(after.ruledOutBy, [reason]);
  }
});

test('with commute pins, "too far" means farther than the rejected place, not the same community', async () => {
  const miles = { [P(1)]: 3, [P(8)]: 4, [P(2)]: 6, [P(9)]: 9, [P(3)]: 12, [P(4)]: 15 }; // farthest straight-line miles to any member's pin
  const store = seed(3, miles);
  await rerunShortlist(store, FLOCK);
  await store.recordFeedback(FLOCK, U(1), P(2), 'too far'); // 6 miles
  assert.deepEqual((await rerunShortlist(store, FLOCK)).savedIds, [1, 8].map(P), 'nothing 6 miles or farther');
  const second = seed(3, miles);
  await second.recordFeedback(FLOCK, U(1), P(8), 'too far'); // 4 miles; plan 1 shares its community but is closer
  assert.deepEqual((await rerunShortlist(second, FLOCK)).savedIds, [P(1)], 'plan 1 stays: it is closer, and distance replaces the community rule');
});

test('nothing passes after the feedback: the old shortlist is left alone', async () => {
  const store = seed();
  await rerunShortlist(store, FLOCK);
  await store.recordFeedback(FLOCK, U(1), P(1), 'too expensive'); // the cheapest plan is rejected for price: nothing is cheaper
  const after = await rerunShortlist(store, FLOCK);
  assert.deepEqual(after.savedIds, []);
  assert.equal(store.saved.size, 5, 'not emptied');
});

test('a membership change refreshes the shortlist from the flock as it is now', async () => {
  const store = seed(null); // one bedroom per member
  assert.deepEqual((await rerunShortlist(store, FLOCK)).savedIds, [1, 8, 2, 9, 3].map(P));
  members[2]!.status = 'left' as never; // a member leaves: two people, two bedrooms, $3,300 combined
  try {
    assert.deepEqual((await rerunShortlist(store, FLOCK)).savedIds, [P(6)], 'only the 2 bd plan within $3,300 passes now');
    assert.deepEqual(ids(store), [P(6)]);
  } finally { members[2]!.status = 'active'; }
});

test('roommate-matcher only suggests: it can read open flocks but nothing is saved or invited', async () => {
  const store = seed();
  const findFlocks = async () => [{ flockId: U(7), name: 'Greenpoint Crew', matchPct: 88, passes: true, reasons: ['Budget is in range'] }];
  const model = fakeModel()
    .respondWithTools([{ name: 'task', args: { description: 'Which open flock could I join?', subagent_type: 'roommate-matcher' } }])
    .respondWithTools([{ name: 'find_open_flocks', args: {} }])
    .respond(new AIMessage('Greenpoint Crew fits.'))
    .respond(new AIMessage('Try Greenpoint Crew.'));
  const agent = createFlockAgent({ store, model: model as never, saver: new MemorySaver(), findFlocks });
  const events = await collect((await agent.stream({ messages: [{ role: 'user', content: 'Find me a flock' }] }, cfg)) as AsyncIterable<[string, unknown]>);
  assert.ok(events.some((e) => e.type === 'step' && e.name === 'roommate-matcher'));
  const found = events.find((e) => e.type === 'tool_result' && e.name === 'task'); // a subagent's inner tool calls are not streamed; its answer is
  assert.ok(found && found.type === 'tool_result' && found.content.includes('Greenpoint Crew'));
  assert.equal(store.saved.size, 0);
  assert.deepEqual(store.invited, []);
});

test('the feedback request needs a listing and reasons together, or neither', () => {
  const ok = { flockId: FLOCK };
  assert.ok(feedbackInput.safeParse(ok).success, 'membership change: flockId alone');
  assert.ok(feedbackInput.safeParse({ ...ok, listingId: P(1), reasons: ['too far', 'no pets'] }).success);
  assert.ok(!feedbackInput.safeParse({ ...ok, listingId: P(1) }).success);
  assert.ok(!feedbackInput.safeParse({ ...ok, reasons: ['too far'] }).success);
  assert.ok(!feedbackInput.safeParse({ ...ok, listingId: P(1), reasons: ['I just hate it'] }).success, 'only the known reasons');
});

test('without the pins migration the distance lookup fails quietly instead of failing the feedback request', async () => {
  const noFunction = { rpc: async () => ({ data: null, error: { message: 'Could not find the function public.flock_pin_distances in the schema cache' } }) };
  assert.deepEqual([...(await supabaseStore(noFunction as never).distances(FLOCK, [P(1)])).entries()], []);
  // and the shortlist still updates, using the same-community rule for "too far"
  const store = seed();
  await store.recordFeedback(FLOCK, U(1), P(1), 'too far');
  assert.deepEqual((await rerunShortlist(store, FLOCK)).savedIds, [2, 9, 3, 4].map(P));
});
