'use client';
import { useState } from 'react';
import Link from 'next/link';
import { swipe, type DucktectPick, type DucktectResult, type GroupListing } from '@/lib/api';
import { notesFor } from '@/lib/agent/ducktect-notes';
import Ducktective from './Ducktective';

// Ducktect best option (docs/DESIGN.md §8.9, ticket T15): a bottom panel, not a modal, so the restyled map (numbered picks, best one
// highlighted) stays visible and tappable behind it. It shows facts from the server's result only; the model's words appear only as the
// vetted summary. Read-only: "Add to flock picks" is the person's own tap on the normal vote path.
export type DucktectState = { text: string; phase: 'running' | 'done' | 'error'; steps: string[]; result: DucktectResult | null; error: string | null };

const STEP_LABELS: Record<string, string> = {
  interpret_wish: 'Reading your wish',
  'apartment-searcher': 'Finding places that fit',
  'aerial-evidence': 'Checking aerial imagery',
  rank_candidates: 'Ranking the best options',
};
const dollars = (n: number) => `$${n.toLocaleString('en-US')}`; // exact: shortPrice would turn $725 into "$0.73k"
const CHECK = { true: '✓', false: '✗', null: '?' } as const;

export default function DucktectPanel({
  state,
  listings,
  hasFlock,
  focusRank,
  onFocus,
  onClose,
  onRetry,
  onRefine,
}: {
  state: DucktectState;
  listings: GroupListing[];
  hasFlock: boolean;
  focusRank: number;
  onFocus: (rank: number) => void;
  onClose: () => void;
  onRetry: () => void;
  onRefine: () => void;
}) {
  const r = state.result;
  const pick = r?.picks.find((p) => p.rank === focusRank) ?? r?.picks[0] ?? null;

  return (
    <section aria-live="polite" aria-label="Ducktect best option" className="rough pointer-events-auto flex max-h-[58dvh] w-full flex-col gap-2.5 overflow-y-auto rounded-lg p-3.5 text-left [--fill:var(--color-card)]">
      <header className="flex items-center gap-2.5">
        <Ducktective height={34} />
        <div className="min-w-0 flex-1">
          <p className="text-[19px] leading-tight font-bold text-ink">Ducktect best option</p>
          <p className="truncate text-[14px] text-muted">“{state.text}”</p>
        </div>
        <button onClick={onClose} aria-label="Close Ducktect" className="shrink-0 p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/close.svg" alt="" width={16} height={16} />
        </button>
      </header>

      {state.phase === 'running' && <Progress steps={state.steps} />}

      {state.phase === 'error' && (
        <div className="flex flex-col gap-2">
          <p className="text-base text-danger">{state.error ?? 'Ducktect could not answer.'}</p>
          <button onClick={onRetry} className="self-start text-base font-bold text-accent">
            Try again
          </button>
        </div>
      )}

      {state.phase === 'done' && r && (
        <>
          {pick && <PickCard key={pick.floorPlanId} pick={pick} listing={listings.find((l) => l.community_id === pick.communityId)} hasFlock={hasFlock} />}
          {r.picks.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-bold tracking-wide text-muted uppercase">Other options</p>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
                {r.picks.map((p) => (
                  <button
                    key={p.floorPlanId}
                    onClick={() => onFocus(p.rank)}
                    aria-pressed={p.rank === pick?.rank}
                    className={`rough shrink-0 rounded-[9px] px-3 py-1.5 text-[14px] font-bold whitespace-nowrap ${p.rank === pick?.rank ? 'text-card [--fill:var(--color-ink)]' : 'text-ink'}`}
                  >
                    {p.rank} · {p.community ?? p.address} · {dollars(p.rentFrom)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {r.summary && <p className="text-[15px] text-ink">{r.summary}</p>}
          {r.alsoConsidered.length > 0 && <p className="text-[14px] text-muted">Also considered: {r.alsoConsidered.map((a) => a.address).join('; ')}.</p>}
          <button onClick={onRefine} className="self-start text-base font-bold text-accent">
            Refine your wish
          </button>
          <ul className="flex flex-col gap-1">
            {notesFor(r).map((n) => (
              <li key={n.text} className={`text-[14px] ${n.tone === 'warn' ? 'font-bold text-danger' : 'text-muted'}`}>
                {n.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Progress({ steps }: { steps: string[] }) {
  const seen = [...new Set(steps)];
  return (
    <ol className="flex flex-col gap-1">
      {seen.map((s, i) => {
        const last = i === seen.length - 1;
        return (
          <li key={s} className={`flex items-center gap-2 text-[15px] ${last ? 'animate-pulse text-ink' : 'text-muted'}`}>
            <span aria-hidden className="w-4 text-center">{last ? '…' : '✓'}</span>
            {STEP_LABELS[s] ?? s}
          </li>
        );
      })}
      {seen.length === 0 && <li className="animate-pulse text-[15px] text-muted">Starting…</li>}
    </ol>
  );
}

function PickCard({ pick, listing, hasFlock }: { pick: DucktectPick; listing: GroupListing | undefined; hasFlock: boolean }) {
  const [added, setAdded] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const photo = listing?.photos?.[0];
  const checks = pick.criteria.filter((c) => !c.key.startsWith('aerial:') && !c.key.startsWith('not checked'));
  const aerial = pick.criteria.filter((c) => c.key.startsWith('aerial:'));

  async function add() {
    setAdded('busy');
    try {
      await swipe(pick.floorPlanId, 'right'); // the normal thumbs-up path: the flock's picks are its votes
      setAdded('done');
    } catch {
      setAdded('error');
    }
  }

  return (
    <article className="flex flex-col gap-2">
      <div className="flex gap-3">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-[84px] shrink-0 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold tracking-wide text-accent uppercase">{pick.rank === 1 ? 'Best option' : `Option ${pick.rank}`}</p>
          <p className="truncate text-[20px] leading-tight font-bold text-ink">{pick.address}</p>
          <p className="truncate text-[15px] text-muted">
            {pick.community ? `${pick.community} · ` : ''}from {dollars(pick.rentFrom)} · {pick.beds === 0 ? 'studio' : `${pick.beds} bd`} · {pick.baths} ba
          </p>
          <span className="mt-0.5 inline-block rounded-[7px] bg-accent-soft px-2 py-0.5 text-[13px] font-bold text-accent">{pick.fitPct}% fit</span>
        </div>
      </div>

      <ul className="flex flex-col gap-0.5">
        {checks.map((c) => (
          <li key={c.key} className="flex gap-1.5 text-[15px] text-ink">
            <span aria-hidden className={`w-4 shrink-0 text-center font-bold ${c.ok === false ? 'text-danger' : c.ok ? 'text-accent' : 'text-muted'}`}>{CHECK[`${c.ok}` as 'true' | 'false' | 'null']}</span>
            <span>{c.detail}</span>
          </li>
        ))}
        {aerial.map((c) => (
          <li key={c.key} className="flex gap-1.5 text-[15px] text-ink">
            <span aria-hidden className={`w-4 shrink-0 text-center font-bold ${c.ok ? 'text-accent' : 'text-muted'}`}>{c.ok ? '◎' : '·'}</span>
            <span>{c.detail}</span>
          </li>
        ))}
      </ul>
      {pick.evidence.find((e) => e.imagery?.capturedAt) && (
        <p className="text-[13px] text-muted">Imagery © Vexcel, captured {pick.evidence.find((e) => e.imagery?.capturedAt)!.imagery!.capturedAt}.</p>
      )}

      <div className="flex gap-2 pt-0.5">
        <Link href={`/listing/${pick.floorPlanId}`} className="rough flex flex-1 items-center justify-center rounded-[9px] px-3 py-2 text-[16px] font-bold text-card [--fill:var(--color-ink)]">
          Open listing
        </Link>
        {hasFlock && (
          <button
            onClick={add}
            disabled={added === 'busy' || added === 'done'}
            className="rough flex flex-1 items-center justify-center rounded-[9px] px-3 py-2 text-[16px] font-bold text-ink disabled:opacity-60 [--fill:var(--color-surface)]"
          >
            {added === 'done' ? 'Added ✓' : added === 'busy' ? 'Adding…' : added === 'error' ? 'Try again' : 'Add to flock picks'}
          </button>
        )}
      </div>
    </article>
  );
}
