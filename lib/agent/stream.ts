// Turns the raw Deep Agents stream ([mode, data] tuples with LangChain message objects) into small JSON events the browser can read,
// one per NDJSON line. Pure apart from reading the objects it is given.
import type { AgentEvent } from './schemas.ts';

type Msg = { getType?: () => string; type?: string; content?: unknown; name?: string; tool_calls?: { name: string; args: Record<string, unknown> }[] };
const kind = (m: Msg) => (typeof m.getType === 'function' ? m.getType() : m.type);
const textOf = (content: unknown): string =>
  typeof content === 'string' ? content : Array.isArray(content) ? content.map((b) => (b && typeof b === 'object' && 'text' in b ? String((b as { text: unknown }).text) : '')).join('') : '';
const clip = (s: string, n = 20000) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function toEvents(mode: string, data: unknown): AgentEvent[] {
  if (mode === 'messages') {
    const m = (Array.isArray(data) ? data[0] : data) as Msg | undefined;
    if (!m) return [];
    if (kind(m) === 'tool' && m.name) return [{ type: 'tool_result', name: m.name, content: clip(textOf(m.content)) }];
    // AI text arrives in pieces; whole AI messages that only carry tool calls have no text to show.
    const text = kind(m) === 'ai' || kind(m) === 'AIMessageChunk' ? textOf(m.content) : '';
    return text ? [{ type: 'token', text }] : [];
  }
  if (mode === 'updates' && data && typeof data === 'object') {
    const u = data as { __interrupt__?: { value?: { actionRequests?: { name: unknown; args?: unknown }[] } }[]; model_request?: { messages?: Msg[] } };
    if (Array.isArray(u.__interrupt__)) {
      const actions = u.__interrupt__.flatMap((i) => (i?.value?.actionRequests ?? []).map((a) => ({ name: String(a.name), args: (a.args ?? {}) as Record<string, unknown> })));
      return actions.length ? [{ type: 'interrupt', actions }] : [];
    }
    const out: AgentEvent[] = [];
    for (const m of u.model_request?.messages ?? []) {
      for (const c of m.tool_calls ?? []) {
        if (c.name === 'write_todos' && Array.isArray(c.args.todos)) {
          out.push({ type: 'todos', todos: (c.args.todos as { content: string; status: string }[]).map((t) => ({ content: String(t.content), status: String(t.status) })) });
        } else {
          out.push({ type: 'step', name: c.name === 'task' ? String(c.args.subagent_type ?? 'subagent') : c.name });
        }
      }
    }
    return out;
  }
  return [];
}

// The NDJSON body for a Response. Always ends with `done`, and turns a thrown error into an `error` event instead of a broken stream.
// `drop` hides events the browser should not see; `after` runs once the source is finished and may send more (Ducktect's final result).
export function ndjson(
  source: AsyncIterable<[string, unknown]>,
  onEvent?: (e: AgentEvent) => void,
  opts: { drop?: (e: AgentEvent) => boolean; after?: (send: (e: AgentEvent) => void) => Promise<void> } = {},
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) => {
        onEvent?.(e);
        if (!opts.drop?.(e)) controller.enqueue(enc.encode(`${JSON.stringify(e)}\n`));
      };
      try {
        for await (const [mode, data] of source) for (const e of toEvents(mode, data)) send(e);
        await opts.after?.(send);
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : 'The agent failed.' });
      }
      send({ type: 'done' });
      controller.close();
    },
  });
}
