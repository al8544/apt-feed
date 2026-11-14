// Browser side of the agent stream: NDJSON lines in, AgentEvents out. Tolerates lines split across chunks and skips garbage.
import type { AgentEvent } from './schemas.ts';

export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AgentEvent> {
  const reader = body.getReader(), dec = new TextDecoder();
  let buf = '';
  const parse = (line: string): AgentEvent | null => {
    try { const e = JSON.parse(line); return e && typeof e.type === 'string' ? (e as AgentEvent) : null; } catch { return null; }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const e = parse(buf.slice(0, nl).trim());
      buf = buf.slice(nl + 1);
      if (e) yield e;
    }
    if (done) break;
  }
  const last = parse(buf.trim());
  if (last) yield last;
}
