'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { CURRENT_USER_ID, getFlockMessages, sendFlockMessage, subscribeToFlockMessages, type FlockMessage, type Profile } from '@/lib/api';
import { firstName } from '@/lib/format';
import Sheet from './Sheet';

// The whole flock in one conversation. Opened from the Members list, like a person's message thread.
export default function FlockChatSheet({ open, members, onClose }: { open: boolean; members: Profile[]; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Flock chat" subtitle={`${members.length} ${members.length === 1 ? 'person' : 'people'}`}>
      {open && <Chat members={members} />}
    </Sheet>
  );
}

function Chat({ members }: { members: Profile[] }) {
  const [messages, setMessages] = useState<FlockMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const who = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    getFlockMessages().then(setMessages).catch((e) => (setError(e.message), setMessages([])));
    // Your own sends are added when they return, so the live feed only needs to add what others write.
    return subscribeToFlockMessages((m) => {
      if (m.sender_id !== CURRENT_USER_ID) setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
    });
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    setError(null);
    try {
      const sent = await sendFlockMessage(body);
      setMessages((prev) => (prev && !prev.some((x) => x.id === sent.id) ? [...prev, sent] : prev));
    } catch (err) {
      setError((err as Error).message);
      setDraft(body);
    }
  }

  return (
    <div className="flex min-h-[50dvh] flex-col">
      <div className="flex flex-1 flex-col gap-1.5 pb-3">
        {!messages ? (
          <div className="flex flex-col gap-2">
            <div className="h-9 w-40 animate-pulse rounded-md bg-surface" />
            <div className="h-9 w-52 animate-pulse self-end rounded-md bg-surface" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-muted">No messages yet. Say hi to the flock 👋</p>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === CURRENT_USER_ID;
            const sender = m.sender_id ? who.get(m.sender_id) : undefined;
            const showName = !mine && messages[i - 1]?.sender_id !== m.sender_id; // name once per run of messages
            return (
              <div key={m.id} className={`flex max-w-[78%] flex-col gap-0.5 ${mine ? 'self-end' : 'self-start'}`}>
                {showName && <span className="px-1 text-sm font-bold text-muted">{sender ? firstName(sender) : 'Former member'}</span>}
                <p className={`rounded-md px-3 py-2 text-[17px] ${mine ? 'bg-ink text-card' : 'bg-surface text-ink'}`}>{m.body}</p>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>
      {error && <p className="pb-2 text-[15px] text-danger">{error}</p>}
      <form onSubmit={send} className="sticky bottom-0 flex gap-2 bg-card pt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Message the flock…"
          className="flex-1 rounded-[9px] bg-surface px-4 py-2.5 text-[17px] outline-none"
        />
        <button disabled={!draft.trim()} aria-label="Send" className="flex size-10 items-center justify-center rounded-[10px] bg-accent text-card disabled:opacity-40">
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
