'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { CURRENT_USER_ID, getMessages, sendMessage, subscribeToMessages, type Message, type Profile } from '@/lib/api';
import Sheet from './Sheet';

export default function MessageSheet({ member, onClose }: { member: Profile | null; onClose: () => void }) {
  return (
    <Sheet open={!!member} onClose={onClose} title={member ? member.display_name : ''}>
      {member && <Thread key={member.id} member={member} />}
    </Sheet>
  );
}

function Thread({ member }: { member: Profile }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMessages(member.id)
      .then(setMessages)
      .catch((e) => (setError(e.message), setMessages([])));
    return subscribeToMessages((m) => {
      if (m.sender_id === member.id) setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
    });
  }, [member.id]);

useEffect(() => {
  bottom.current?.scrollIntoView({ block: 'end' });
}, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const temp: Message = {
      id: `temp-${Date.now()}`,
      sender_id: CURRENT_USER_ID,
      recipient_id: member.id,
      listing_id: null,
      body,
      created_at: new Date().toISOString(),
    };
    setDraft('');
    setMessages((prev) => [...(prev ?? []), temp]);
    try {
      await sendMessage(member.id, body);
    } catch (err) {
      setError((err as Error).message);
      setMessages((prev) => prev?.filter((m) => m.id !== temp.id) ?? null);
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
          <p className="py-10 text-center text-[15px] text-muted">Say hi to {member.display_name.split(' ')[0]} 👋</p>
        ) : (
          messages.map((m) => (
            <p
              key={m.id}
              className={`max-w-[75%] rounded-md px-3 py-2 text-[17px] ${
                m.sender_id === CURRENT_USER_ID ? 'self-end bg-ink text-card' : 'self-start bg-surface text-ink'
              }`}
            >
              {m.body}
            </p>
          ))
        )}
        <div ref={bottom} />
      </div>
      {error && <p className="pb-2 text-[15px] text-danger">{error}</p>}
      <form onSubmit={send} className="sticky bottom-0 flex gap-2 bg-card pt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-[9px] bg-surface px-4 py-2.5 text-[17px] outline-none"
        />
        <button
          disabled={!draft.trim()}
          aria-label="Send"
          className="flex size-10 items-center justify-center rounded-[10px] bg-accent text-card disabled:opacity-40"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
