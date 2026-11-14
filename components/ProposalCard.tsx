'use client';
import { useState } from 'react';
import { respondToProposal, type Proposal } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/AuthUI';

// An agent-proposed group (ticket T11). It becomes a flock only when everyone accepts; one decline closes it.
export default function ProposalCard({ proposal, onAnswered }: { proposal: Proposal; onAnswered: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      const status = await respondToProposal(proposal.id, accept);
      if (status === 'expired' || status === 'closed') setError('This proposal is no longer open.');
      onAnswered(); // reload: a new flock, a closed proposal, or "waiting" all change what the page shows
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rough flex flex-col gap-3 rounded-lg px-4 py-3.5 [--fill:var(--color-accent-soft)]">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-bold text-accent">Proposed by your agent</p>
        <p className="truncate text-[22px] font-bold text-ink">{proposal.name}</p>
        <p className="text-[15px] text-muted">
          {proposal.accepted ? "You're in. Waiting for the others to accept." : 'Becomes a flock once everyone accepts.'}
        </p>
      </div>
      <div className="flex">
        {proposal.members.slice(0, 5).map((m) => (
          <Avatar key={m.id} user={m} size={28} className="-mr-2 last:mr-0" />
        ))}
      </div>
      {error && <p className="text-base text-danger">{error}</p>}
      {!proposal.accepted && (
        <div className="flex gap-3">
          <Button secondary disabled={busy} onClick={() => answer(false)}>
            Decline
          </Button>
          <Button disabled={busy} onClick={() => answer(true)}>
            Accept
          </Button>
        </div>
      )}
    </section>
  );
}
