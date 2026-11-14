'use client';
import { useState } from 'react';
import { GROUP_NAME } from '@/lib/format';
import { inviteFriends } from '@/lib/share';
import NavBar from '@/components/NavBar';

// Figma "05b Invite Friends". shortcut: share/copy of the app link only; per-person invites and the
// "Waiting to join" list need an invites table the API doesn't have.
export default function InvitePage() {
  const [note, setNote] = useState<string | null>(null);
  const link = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <main className="min-h-dvh bg-card pb-6">
      <NavBar title="Invite friends" />
      <div className="flex flex-col gap-2 px-4">
        <p className="pb-2 text-[15px] text-muted">Friends who join can like places, stash and tour with you.</p>
        <label className="text-base font-bold text-ink">Invite link</label>
        <div suppressHydrationWarning className="rough rounded-md px-3.5 py-3 text-lg text-muted [--fill:var(--color-surface)]">{link.replace(/^https?:\/\//, '') || ' '}</div>
        <button
          onClick={async () => setNote(await inviteFriends(GROUP_NAME))}
          className="rough rounded-lg py-3 text-lg font-bold text-ink [--fill:var(--color-surface)]"
        >
          Share link
        </button>
        <p role="status" className="h-5 text-center text-[15px] text-muted">{note}</p>
      </div>
    </main>
  );
}
