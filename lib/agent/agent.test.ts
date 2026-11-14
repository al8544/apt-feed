// Run: node --test lib/agent/agent.test.ts
// Drives the real Deep Agent graph with a scripted fake model (no API key, no network, no database), so these tests check OUR
// wiring: tools, context, the shortlist rules, the pause for invites and the stream events. They cannot check what a real model says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIMessage } from '@langchain/core/messages';
import { fakeModel } from '@langchain/core/testing';
import { Command, MemorySaver } from '@langchain/langgraph';
import { createFlockAgent, threadId } from './flock-agent.ts';
import { memoryStore, type Plan } from './store.ts';
import { ndjson, toEvents } from './stream.ts';
import { inventedNumbers } from './guard.ts';
import { contextSchema, type AgentEvent } from './schemas.ts';

const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const P = (n: number) => `10000000-0000-4000-8000-00000000000${n}`;
const FLOCK = U(9);
const plan = (n: number, rent: number, beds: number): Plan => ({ id: P(n), address: `${n}00 Test St`, rentMin: rent, rentMax: null, beds, baths: 2, sqft: 1000, pets: null, neighborhood: '', communityName: `Test ${n}` });
const seed = () => memoryStore({
  plans: [plan(1, 4500, 3), plan(2, 4650, 3), plan(3, 5200, 3), plan(4, 3000, 2)],
  needs: { size: 3, members: [[1, 1700], [2, 1600], [3, 1400]].map(([n, b]) => ({ userId: U(n!), status: 'active' as const, budgetMax: b! })), bedroomsNeeded: 3, areas: [], needsPets: false, dealbreakers: [] },
});
const cfg = (mode: string[] = ['updates', 'messages']) => ({ streamMode: mode, context: { userId: U(1), flockId: FLOCK }, configurable: { thread_id: threadId(FLOCK, U(1)) } }) as never;
const ask = (text: string) => ({ messages: [{ role: 'user', content: text }] });

async function collect(source: AsyncIterable<[string, unknown]>) {
  const events: AgentEvent[] = [];
  for await (const [mode, data] of source) events.push(...toEvents(mode, data));
  return events;
}

test('the demo wish ends in a saved shortlist whose explanations come from the checks', async () => {
  const store = seed();
  const model = fakeModel()
    .respondWithTools([{ name: 'task', args: { description: 'Find 3 bedrooms under $4,700 combined', subagent_type: 'apartment-searcher' } }])
    .respondWithTools([{ name: 'search_apartments', args: { maxRent: 4700, beds: 3 } }])
    .respondWithTools([{ name: 'rank_apartments', args: { listingIds: [P(1), P(2), P(3)] } }])
    .respond(new AIMessage('ranked'))
    .respondWithTools([{ name: 'update_shortlist', args: { picks: [{ listingId: P(1) }, { listingId: P(2) }, { listingId: P(3) }, { listingId: P(7) }] } }])
    .respond(new AIMessage('Saved your shortlist.'));
  const agent = createFlockAgent({ store, model: model as never, saver: new MemorySaver() });
  const events = await collect((await agent.stream(ask('We need 3 bedrooms under $4,700'), cfg())) as AsyncIterable<[string, unknown]>);

  assert.deepEqual([...store.saved.keys()].sort(), [P(1), P(2)], 'only floor plans that pass are saved: P3 is over budget, P7 does not exist');
  assert.match(store.saved.get(P(1))!.explanation, /budget: fits the combined budget of \$4,700/);
  assert.match(store.saved.get(P(1))!.explanation, /beds: 3 bd for 3 needed/);
  const result = events.find((e) => e.type === 'tool_result' && e.name === 'update_shortlist');
  assert.ok(result && result.type === 'tool_result' && /"saved":2/.test(result.content) && /no such floor plan/.test(result.content) && /fails: budget/.test(result.content));
  assert.ok(events.some((e) => e.type === 'step' && e.name === 'apartment-searcher'), 'the plan streams as steps, including the subagent');
  assert.ok(events.some((e) => e.type === 'token' && e.text.includes('Saved your shortlist')));
});

test('the flock comes from the request context, not from anything the model passes', async () => {
  const store = seed();
  const model = fakeModel()
    .respondWithTools([{ name: 'update_shortlist', args: { flockId: U(5), picks: [{ listingId: P(1) }] } }]) // the model tries to name another flock
    .respond(new AIMessage('done'));
  await collect((await createFlockAgent({ store, model: model as never, saver: new MemorySaver() }).stream(ask('save it'), cfg())) as AsyncIterable<[string, unknown]>);
  assert.deepEqual([...new Set(store.flocksSeen)], [FLOCK]);
  assert.throws(() => contextSchema.parse({ userId: 'not-a-uuid', flockId: FLOCK }));
});

test('send_invites pauses for approval; reject invites nobody; approve invites them', async () => {
  for (const decision of ['reject', 'approve'] as const) {
    const store = seed();
    const model = fakeModel().respondWithTools([{ name: 'send_invites', args: { usernames: ['maya.k', 'samlee'] } }]).respond(new AIMessage('ok'));
    const agent = createFlockAgent({ store, model: model as never, saver: new MemorySaver() });
    const first = await collect((await agent.stream(ask('invite maya and sam'), cfg())) as AsyncIterable<[string, unknown]>);
    const pause = first.find((e) => e.type === 'interrupt');
    assert.ok(pause && pause.type === 'interrupt' && pause.actions[0]!.name === 'send_invites' && (pause.actions[0]!.args.usernames as string[]).length === 2, 'the pause names the action and who');
    assert.deepEqual(store.invited, [], 'nothing is sent while paused');
    const dec = decision === 'approve' ? { type: 'approve' } : { type: 'reject', message: 'not now' };
    await collect((await agent.stream(new Command({ resume: { decisions: [dec] } }), cfg())) as AsyncIterable<[string, unknown]>);
    assert.deepEqual(store.invited, decision === 'approve' ? ['maya.k', 'samlee'] : [], `${decision}: invites`);
  }
});

test('a pause belongs to its thread: resuming as someone else does nothing; the owner can still approve', async () => {
  const store = seed();
  const model = fakeModel().respondWithTools([{ name: 'send_invites', args: { usernames: ['maya.k'] } }]).respond(new AIMessage('ok'));
  const agent = createFlockAgent({ store, model: model as never, saver: new MemorySaver() });
  await collect((await agent.stream(ask('invite maya'), cfg())) as AsyncIterable<[string, unknown]>);
  const other = { streamMode: ['updates'], context: { userId: U(2), flockId: FLOCK }, configurable: { thread_id: threadId(FLOCK, U(2)) } } as never;
  await collect((await agent.stream(new Command({ resume: { decisions: [{ type: 'approve' }] } }), other)) as AsyncIterable<[string, unknown]>).catch(() => []);
  assert.deepEqual(store.invited, [], "another user's approval does not release someone else's pause");
  await collect((await agent.stream(new Command({ resume: { decisions: [{ type: 'approve' }] } }), cfg())) as AsyncIterable<[string, unknown]>);
  assert.deepEqual(store.invited, ['maya.k'], 'the owner of the thread still can');
  assert.notEqual(threadId(FLOCK, U(1)), threadId(FLOCK, U(2)));
});

test('a subagent\'s answer comes back to the orchestrator as a tool result', async () => {
  const store = seed();
  const model = fakeModel().respondWithTools([{ name: 'task', args: { description: 'x', subagent_type: 'apartment-searcher' } }])
    .respondWithTools([{ name: 'rank_apartments', args: { listingIds: [P(3)] } }]).respond(new AIMessage('none pass')).respond(new AIMessage('Nothing fits.'));
  const agent = createFlockAgent({ store, model: model as never, saver: new MemorySaver() });
  const events = await collect((await agent.stream(ask('3 bd under 4700'), cfg())) as AsyncIterable<[string, unknown]>);
  const ranked = events.find((e) => e.type === 'tool_result' && e.name === 'task');
  assert.ok(ranked, 'the subagent result comes back as a tool result');
});

test('process_feedback records the reason and marks the pick contested', async () => {
  const store = seed();
  const model = fakeModel().respondWithTools([{ name: 'process_feedback', args: { listingId: P(1), reason: 'too far' } }]).respond(new AIMessage('noted'));
  await collect((await createFlockAgent({ store, model: model as never, saver: new MemorySaver() }).stream(ask('Maya says it is too far'), cfg())) as AsyncIterable<[string, unknown]>);
  assert.deepEqual(store.feedback, [`${P(1)}:too far`]);
});

test('ndjson ends with done, and turns a failure into an error event', async () => {
  async function* boom(): AsyncGenerator<[string, unknown]> { yield ['messages', [{ type: 'ai', content: 'hi' }]]; throw new Error('model unavailable'); }
  const text = await new Response(ndjson(boom())).text();
  const lines = text.trim().split('\n').map((l) => JSON.parse(l) as AgentEvent);
  assert.deepEqual(lines.map((l) => l.type), ['token', 'error', 'done']);
});

test('toEvents reads todos and interrupts and ignores noise', () => {
  assert.deepEqual(toEvents('updates', { model_request: { messages: [{ type: 'ai', tool_calls: [{ name: 'write_todos', args: { todos: [{ content: 'search', status: 'in_progress' }] } }] }] } }), [{ type: 'todos', todos: [{ content: 'search', status: 'in_progress' }] }]);
  assert.deepEqual(toEvents('updates', { __interrupt__: [{ value: { actionRequests: [{ name: 'send_invites', args: { usernames: ['a'] } }] } }] }), [{ type: 'interrupt', actions: [{ name: 'send_invites', args: { usernames: ['a'] } }] }]);
  assert.deepEqual(toEvents('updates', { 'FilesystemMiddleware.before_agent': {} }), []);
  assert.deepEqual(toEvents('messages', []), []);
});

test('inventedNumbers finds dollar amounts and percentages that no tool result contains', () => {
  const tool = [JSON.stringify({ rentFrom: 4500, combinedBudget: 4700, fitPct: 75 })];
  assert.deepEqual(inventedNumbers('It is $4,500 a month, inside your $4,700 budget, a 75% fit.', tool), []);
  assert.deepEqual(inventedNumbers('About $4.5k a month.', tool), []);
  assert.deepEqual(inventedNumbers('It costs $3,900 and fits 92% of what you want.', tool), ['$3,900', '92%']);
  assert.deepEqual(inventedNumbers('No numbers here.', tool), []);
});

test('readEvents rebuilds events from NDJSON split anywhere, and skips garbage', async () => {
  const { readEvents } = await import('./client.ts');
  const text = '{"type":"token","text":"Hel"}\nnot json\n{"type":"token","text":"lo"}\n{"type":"done"}';
  for (const cut of [1, 7, 20, text.length]) {
    const bytes = new TextEncoder().encode(text);
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes.slice(0, cut)); c.enqueue(bytes.slice(cut)); c.close(); } });
    const got: AgentEvent[] = [];
    for await (const e of readEvents(body)) got.push(e);
    assert.deepEqual(got.map((e) => e.type), ['token', 'token', 'done'], `cut at ${cut}`);
  }
});
