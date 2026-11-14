'use client';
import { useState } from 'react';
import Link from 'next/link';
import { swipe, undoSwipe, type DucktectPick, type DucktectResult, type GroupListing } from '@/lib/api';
import { notesFor, readingLines } from '@/lib/agent/ducktect-notes';
import Ducktective from './Ducktective';

// Ducktect best option (docs/DESIGN.md §8.9, ticket T15): a bottom panel, not a modal, so the restyled map (numbered picks, best one
// highlighted) stays visible and tappable behind it. It shows facts from the server's result only; the model's words appear only as the
// vetted summary. Read-only: "Add to flock picks" is the person's own tap on the normal vote path.
export type DucktectState = {
  text: string;
  phase: 'running' | 'done' | 'error';
  steps: string[];
  result: DucktectResult | null;
  error: string | null;
};

const STEP_LABELS: Record<string, string> = {
  get_user_context: 'Reading your profile',
  interpret_wish: 'Working out what your day needs',
  'area-scout': 'Looking around the areas',
  'aerial-evidence': 'Confirming from above with satellite',
  rank_candidates: 'Ranking the best options',
  explain_picks: 'Writing why each one suits you',
};
const dollars = (n: number) => `$${n.toLocaleString('en-US')}`; // exact: shortPrice would turn $725 into "$0.73k"
const CHECK = { true: '✓', false: '✗', null: '?' } as const;

export default function DucktectPanel({
  state,
  listings,
  hasFlock,
  swipes,
  onVote,
  focusRank,
  onFocus,
  onClose,
  onRetry,
  onRefine,
}: {
  state: DucktectState;
  listings: GroupListing[];
  hasFlock: boolean;
  swipes: Map<string, 'left' | 'right'>; // your votes in this flock: the one source of truth for the button
  onVote: (listingId: string, direction: 'right' | null) => void; // null = the vote was undone
  focusRank: number;
  onFocus: (rank: number) => void;
  onClose: () => void;
  onRetry: () => void;
  onRefine: () => void;
}) {
  const [min, setMin] = useState(false); // collapsed to just the header, so the map stays visible
  const r = state.result;
  const pick = r?.picks.find((p) => p.rank === focusRank) ?? r?.picks[0] ?? null;

  return (
    // The "rough" fill is a pseudo-element pinned to the top of this box, so this box must not scroll (it would leave the fill behind and the
    // panel would turn see-through): the scrolling happens in the inner div.
    <section
      aria-live="polite"
      aria-label="Ask Ducktective"
      className="rough pointer-events-auto flex max-h-[68dvh] w-full flex-col rounded-lg text-left [--fill:var(--color-card)]"
    >
      <header className="flex shrink-0 items-center gap-2.5 px-3.5 pt-3.5 pb-2">
        <Ducktective height={34} />
        <div className="min-w-0 flex-1">
          <p className="text-[19px] leading-tight font-bold text-ink">Ask Ducktective</p>
          <p className="truncate text-[14px] text-muted">“{state.text}”</p>
        </div>
        {state.phase === 'done' && (
          <button onClick={() => setMin((m) => !m)} aria-label={min ? 'Expand Ducktective' : 'Minimize Ducktective'} aria-expanded={!min} className="shrink-0 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/down.svg" alt="" width={18} height={18} className={`transition-transform duration-300 ${min ? 'rotate-180' : ''}`} />
          </button>
        )}
        <button onClick={onClose} aria-label="Close Ducktective" className="shrink-0 p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/close.svg" alt="" width={16} height={16} />
        </button>
      </header>

      {/* grid 1fr/0fr animates the collapse; the inner box clips instead of scrolling while closed */}
      <div className={`grid min-h-0 flex-1 transition-[grid-template-rows] duration-300 ${min && state.phase === 'done' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
      <div className={`no-scrollbar flex min-h-0 flex-col gap-2.5 overflow-y-auto px-3.5 ${min && state.phase === 'done' ? 'overflow-hidden pb-0' : 'pb-3.5'}`}>
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
            {pick && (
              <PickCard
                key={pick.floorPlanId}
                pick={pick}
                listing={listings.find((l) => l.community_id === pick.communityId)}
                hasFlock={hasFlock}
                swipes={swipes}
                onVote={onVote}
              />
            )}
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
            {(r.dailyLife || r.interpreted.checks.length > 0) && (
              <details className="text-[14px] text-muted">
                <summary className="cursor-pointer font-bold text-ink">How I read your day</summary>
                {r.dailyLife && <p className="pt-1">{r.dailyLife}</p>}
                <ul className="list-disc pl-5 pt-1">
                  {readingLines(r).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </details>
            )}
            {r.alsoConsidered.length > 0 && (
              <p className="text-[14px] text-muted">Also considered: {r.alsoConsidered.map((a) => a.address).join('; ')}.</p>
            )}
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
      </div>
      </div>
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
            <span aria-hidden className="w-4 text-center">
              {last ? '…' : '✓'}
            </span>
            {STEP_LABELS[s] ?? s}
          </li>
        );
      })}
      {seen.length === 0 && <li className="animate-pulse text-[15px] text-muted">Starting…</li>}
    </ol>
  );
}

function PickCard({
  pick,
  listing,
  hasFlock,
  swipes,
  onVote,
}: {
  pick: DucktectPick;
  listing: GroupListing | undefined;
  hasFlock: boolean;
  swipes: Map<string, 'left' | 'right'>;
  onVote: (listingId: string, direction: 'right' | null) => void;
}) {
  const [vote, setVote] = useState<'idle' | 'busy' | 'error'>('idle');
  const photo = listing?.photos?.[0];
  // The listing page and the flock's votes know a place by its map card (one representative plan per community), not by the floor plan Ducktect
  // ranked, so use the card's id; the floor plan id is only a fallback for the vote.
  const cardId = listing?.id ?? null;
  const voteId = cardId ?? pick.floorPlanId;
  const added = swipes.get(voteId) === 'right'; // read from your votes, so it is right even if you added this place earlier
  const checks = pick.criteria.filter((c) => !c.key.startsWith('around:') && !c.key.startsWith('satellite:') && !c.key.startsWith('not checked'));
  const around = pick.criteria.filter((c) => c.key.startsWith('around:'));
  const aerial = pick.criteria.filter((c) => c.key.startsWith('satellite:'));

  // A toggle: the normal thumbs-up path (the flock's picks are its votes), and a second tap takes it back.
  async function toggle() {
    setVote('busy');
    try {
      if (added) {
        await undoSwipe(voteId);
        onVote(voteId, null);
      } else {
        await swipe(voteId, 'right');
        onVote(voteId, 'right');
      }
      setVote('idle');
    } catch {
      setVote('error');
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
            {pick.community ? `${pick.community} · ` : ''}
            {pick.area ? `${pick.area} · ` : ''}from {dollars(pick.rentFrom)} · {pick.beds === 0 ? 'studio' : `${pick.beds} bd`} · {pick.baths} ba
          </p>
          <span className="mt-0.5 inline-block rounded-[7px] bg-accent-soft px-2 py-0.5 text-[13px] font-bold text-accent">{pick.fitPct}% fit</span>
        </div>
      </div>

      {pick.why && <p className="text-[15px] text-ink">{pick.why}</p>}
      {pick.tradeOff && <p className="text-[14px] text-muted">Trade-off: {pick.tradeOff}</p>}
      <ul className="flex flex-col gap-0.5">
        {checks.map((c) => (
          <li key={c.key} className="flex gap-1.5 text-[15px] text-ink">
            <span
              aria-hidden
              className={`w-4 shrink-0 text-center font-bold ${c.ok === false ? 'text-danger' : c.ok ? 'text-accent' : 'text-muted'}`}
            >
              {CHECK[`${c.ok}` as 'true' | 'false' | 'null']}
            </span>
            <span>{c.detail}</span>
          </li>
        ))}
        {around.map((c) => (
          <li key={c.key} className="flex gap-1.5 text-[15px] text-ink">
            <span
              aria-hidden
              className={`w-4 shrink-0 text-center font-bold ${c.ok === false ? 'text-danger' : c.ok ? 'text-accent' : 'text-muted'}`}
            >
              {c.ok === false ? '✗' : c.ok ? '⌖' : '·'}
            </span>
            <span>{c.detail}</span>
          </li>
        ))}
        {aerial.map((c) => (
          <li key={c.key} className="flex gap-1.5 text-[15px] text-ink">
            <span aria-hidden className={`w-4 shrink-0 text-center font-bold ${c.ok ? 'text-accent' : 'text-muted'}`}>
              {c.ok ? '◎' : '·'}
            </span>
            <span>{c.detail}</span>
          </li>
        ))}
      </ul>
      {pick.evidence.find((e) => e.imagery?.capturedAt) && (
        <p className="text-[13px] text-muted">Imagery © Vexcel, captured {pick.evidence.find((e) => e.imagery?.capturedAt)!.imagery!.capturedAt}.</p>
      )}

      <div className="flex gap-2 pt-0.5">
        {cardId ? (
          <Link
            href={`/listing/${cardId}`}
            className="rough flex flex-1 items-center justify-center rounded-[9px] px-3 py-2 text-[16px] font-bold text-card [--fill:var(--color-ink)]"
          >
            Open listing
          </Link>
        ) : (
          <span className="rough flex flex-1 items-center justify-center rounded-[9px] px-3 py-2 text-[16px] font-bold text-card opacity-50 [--fill:var(--color-ink)]">
            Not on the map yet
          </span>
        )}
        {hasFlock && (
          <button
            onClick={toggle}
            disabled={vote === 'busy'}
            aria-pressed={added}
            aria-label={added ? 'Added to flock picks. Tap to undo.' : undefined}
            className={`rough flex flex-1 items-center justify-center rounded-[9px] px-3 py-2 text-[16px] font-bold disabled:opacity-60 ${added ? 'text-card [--fill:var(--color-accent)]' : 'text-ink [--fill:var(--color-surface)]'}`}
          >
            {vote === 'busy' ? (added ? 'Removing…' : 'Adding…') : vote === 'error' ? 'Try again' : added ? 'Added ✓ Undo' : 'Add to flock picks'}
          </button>
        )}
      </div>
    </article>
  );
}
