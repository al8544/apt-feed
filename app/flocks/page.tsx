'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyFlocks, getMyProposals, getProfile, selectFlock, type FlockSummary, type Profile, type Proposal } from '@/lib/api';
import { shortPrice } from '@/lib/format';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/AuthUI';
import ProposalCard from '@/components/ProposalCard';

// Figma 00d Your flocks: where sign-in lands. Picking a flock sets the one every screen reads.
export default function YourFlocksPage() {
  const router = useRouter();
  const [flocks, setFlocks] = useState<FlockSummary[] | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [proposals, setProposals] = useState<Proposal[]>([]);

  // Also run after answering a proposal: accepting the last one adds a flock to the list.
  function load() {
    getMyFlocks()
      .then(setFlocks)
      .catch((e) => (setError(e.message), setFlocks([])));
    getMyProposals().then(setProposals).catch(() => {});
  }

  useEffect(() => {
    load();
    getProfile().then(setMe).catch(() => {});
  }, []);

  function open(id: string) {
    selectFlock(id);
    router.push('/');
  }

  return (
    <main className="flex min-h-dvh flex-col gap-3 bg-card px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[calc(36px+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[34px] font-bold text-ink">Your flocks</h1>
          <p className="text-lg text-muted">Pick a flock to keep house hunting</p>
        </div>
        <Link href="/account" aria-label="My account">
          {me ? <Avatar user={me} size={40} /> : <div className="size-10 rounded-full bg-surface" />}
        </Link>
      </header>

      {error && <p className="text-base text-danger">{error}</p>}
      {proposals.map((p) => (
        <ProposalCard key={p.id} proposal={p} onAnswered={load} />
      ))}
      {!flocks ? (
        [0, 1].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-lg bg-surface" />)
      ) : flocks.length === 0 ? (
        <p className="rough rounded-lg p-4 text-center text-lg text-muted [--fill:var(--color-surface)]">
          You&apos;re not in a flock yet. Ask a friend for their invite link.
        </p>
      ) : (
        flocks.map((f) => (
          <button
            key={f.id}
            onClick={() => open(f.id)}
            className="rough flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left [--fill:var(--color-surface)]"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate text-[22px] font-bold text-ink">{f.name}</p>
              <p className="truncate text-[15px] text-muted">{summary(f)}</p>
              <div className="flex">
                {f.members.slice(0, 5).map((m) => (
                  <Avatar key={m.id} user={m} size={28} className="-mr-2 last:mr-0" />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className={`rounded-[7px] px-2.5 py-[3px] text-sm font-bold ${f.kind === 'open' ? 'bg-accent-soft text-accent' : 'bg-card text-ink'}`}>
                {f.kind === 'open' ? 'Open' : 'Friends'}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/chevron.svg" alt="" width={20} height={20} />
            </div>
          </button>
        ))
      )}

      <div className="flex-1" />
      <Button href="/flocks/new">Create a new flock</Button>
      <Button href="/flocks/find" secondary>
        Find a flock
      </Button>
    </main>
  );
}

// "4 flockmates · Williamsburg · $3-4k" / "3 of 4 spots · Greenpoint · $2.5-3.5k"
function summary(f: FlockSummary) {
  const n = f.members.length;
  const people = f.kind === 'open' && f.maxSize ? `${n} of ${f.maxSize} spots` : `${n} ${n === 1 ? 'flockmate' : 'flockmates'}`;
  const budget = f.budgetMin != null && f.budgetMax != null ? `${shortPrice(f.budgetMin)}–${shortPrice(f.budgetMax)}` : null;
  return [people, f.areas[0], budget].filter(Boolean).join(' · ');
}
