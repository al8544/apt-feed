'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGroupMembers, getMapListings, getStash, getTouredListingIds, type GroupListing } from '@/lib/api';
import { flockScore } from '@/lib/compare';
import RankingRow from '@/components/RankingRow';
import NavBar from '@/components/NavBar';

const MAX = 4;
type Source = 'liked' | 'stashed' | 'toured';
const SOURCES: [Source, string][] = [
  ['liked', 'Flock liked'],
  ['stashed', 'Stashed'],
  ['toured', 'Toured'],
];

// Figma "08a Compare · Pick".
export default function ComparePickPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [listings, setListings] = useState<GroupListing[] | null>(null);
  const [groupSize, setGroupSize] = useState(0);
  const [stashed, setStashed] = useState<Set<string>>(new Set());
  const [toured, setToured] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<Source>('liked');
  const [picked, setPicked] = useState<string[]>(() => (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, MAX));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMapListings()
      .then(setListings)
      .catch((e) => (setError(e.message), setListings([])));
    getGroupMembers().then((m) => setGroupSize(m.length)).catch(() => {});
    getStash().then((ls) => setStashed(new Set(ls.map((l) => l.id)))).catch(() => {});
    getTouredListingIds().then(setToured).catch(() => {});
  }, []);

  const inSource = (l: GroupListing) =>
    source === 'liked' ? l.likes > 0 : source === 'stashed' ? stashed.has(l.id) : toured.has(l.id);
  const shown = (listings ?? [])
    .filter((l) => inSource(l) || picked.includes(l.id))
    .map((l) => ({ l, score: flockScore(l, groupSize) }))
    .sort((a, b) => b.score - a.score); // stable order, so rows don't jump while picking

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX ? [...p, id] : p));

  return (
    <main className="min-h-dvh bg-surface pb-28">
      <NavBar title="Pick places" />

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-1.5 pb-3.5">
        {SOURCES.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSource(key)}
            aria-pressed={source === key}
            className={`rough shrink-0 rounded-full px-3.5 py-1.5 text-base font-bold ${source === key ? 'text-card [--fill:var(--color-ink)]' : 'text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center px-4 pt-0.5 pb-2">
        <p className="flex-1 text-base text-muted">
          Pick up to {MAX} · {picked.length} of {MAX} selected
        </p>
        <button onClick={() => setPicked([])} disabled={!picked.length} className="text-[17px] font-bold text-ink disabled:opacity-40">
          Clear
        </button>
      </div>

      {error && <p className="px-4 pb-2 text-[15px] text-danger">{error}</p>}
      {!listings ? (
        [0, 1, 2, 3].map((i) => <div key={i} className="mx-4 my-2 h-[60px] animate-pulse rounded-xl bg-card" />)
      ) : shown.length === 0 ? (
        <p className="rough mx-4 rounded-[18px] p-4 text-center text-base text-muted">Nothing here yet.</p>
      ) : (
        shown.map(({ l, score }) => {
          const n = picked.indexOf(l.id) + 1;
          const full = !n && picked.length >= MAX;
          return (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              disabled={full}
              aria-pressed={!!n}
              className={`block w-full text-left ${n ? 'bg-card' : ''} ${full ? 'opacity-50' : ''}`}
            >
              <RankingRow
                listing={l}
                score={score}
                groupSize={groupSize}
                rank={
                  n ? (
                    <span className="rough flex size-[30px] shrink-0 items-center justify-center rounded-full text-[17px] font-bold text-card [--fill:var(--color-ink)]">
                      {n}
                    </span>
                  ) : (
                    <span className="size-[30px] shrink-0 rounded-full border-2 border-ink bg-card" />
                  )
                }
              />
            </button>
          );
        })
      )}

      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-b from-card/0 via-card via-35% to-card px-4 pt-7 pb-3">
        <button
          onClick={() => router.push(`/compare?ids=${picked.join(',')}`)}
          disabled={picked.length < 2}
          className="rough h-[52px] w-full rounded-full text-[21px] font-bold text-card [--fill:var(--color-ink)] disabled:opacity-35"
        >
          {picked.length < 2 ? 'Pick at least 2' : `Compare ${picked.length} places →`}
        </button>
      </div>
    </main>
  );
}
