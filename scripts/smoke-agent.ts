// Smoke test for ticket T12: one createDeepAgent call with ONE tool, ONE subagent and a contextSchema, on the chosen model.
//   node --env-file=.env.local scripts/smoke-agent.ts      (real model: openai:gpt-5-mini, needs OPENAI_API_KEY; a few cents)
//   node scripts/smoke-agent.ts --fake                       (scripted model, no key: checks only our wiring)
// GPT-5 models reject non-default sampling settings, so this sets none.
import { AIMessage } from '@langchain/core/messages';
import { fakeModel } from '@langchain/core/testing';
import { createDeepAgent, type SubAgent } from 'deepagents';
import { tool } from 'langchain';
import * as z from 'zod';
import { DEFAULT_MODEL } from '../lib/agent/flock-agent.ts';

const fake = process.argv.includes('--fake');
if (!fake && !process.env.OPENAI_API_KEY) {
  console.error('Set OPENAI_API_KEY (node --env-file=.env.local ...), or run with --fake.');
  process.exit(1);
}

const contextSchema = z.object({ userId: z.string() });
const ping = tool(
  async ({ n }: { n: number }, runtime: { context?: unknown }) => `pong ${n} for ${contextSchema.parse(runtime.context).userId}`,
  { name: 'ping', description: 'Returns pong for a number, for the user in the request context.', schema: z.object({ n: z.number() }) },
);
const echo: SubAgent = { name: 'echo', description: 'Calls ping and reports its answer.', systemPrompt: 'Call ping with the number you are given and reply with its exact result.', tools: [ping] };

const model = fake
  ? (fakeModel()
      .respondWithTools([{ name: 'task', args: { description: 'ping 7', subagent_type: 'echo' } }])
      .respondWithTools([{ name: 'ping', args: { n: 7 } }])
      .respond(new AIMessage('pong 7 for smoke-user'))
      .respond(new AIMessage('The echo subagent says: pong 7 for smoke-user')) as never)
  : DEFAULT_MODEL;
const agent = createDeepAgent({ model, systemPrompt: 'Delegate to the echo subagent, then report what it said.', subagents: [echo], contextSchema });

const started = Date.now();
const result = await agent.invoke({ messages: [{ role: 'user', content: 'Use the echo subagent to ping 7 and tell me the result.' }] }, { context: { userId: 'smoke-user' }, recursionLimit: 20 } as never);
const last = result.messages.at(-1);
const text = typeof last?.content === 'string' ? last.content : JSON.stringify(last?.content);
const sawTool = result.messages.some((m: { name?: string; content?: unknown }) => m.name === 'task' && String(m.content).includes('pong 7 for smoke-user'));
console.log(`model: ${fake ? 'fake (scripted)' : DEFAULT_MODEL}   ${Date.now() - started} ms`);
console.log(`answer: ${text}`);
console.log(sawTool && text.includes('pong 7') ? 'PASS: tool, subagent and context all worked.' : 'FAIL: the subagent result did not reach the answer.');
process.exit(sawTool && text.includes('pong 7') ? 0 : 1);
