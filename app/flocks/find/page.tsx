'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { discoverFlocks, getProfile, updatePreferences, type DiscoveredFlock, type Profile } from '@/lib/api';
import { BUDGETS, LA_AREAS } from '@/lib/flocks';
import { shortPrice } from '@/lib/format';
import Avatar from '@/components/Avatar';
import { Button, Field } from '@/components/AuthUI';
import { Chips, StepHeader, screen } from '@/components/FormUI';

type Sort = 'match' | 'newest' | 'space';

// Figma 00i Find a flock. Open flocks that fit your budget, beds and dates, ranked on the server.
export default function FindFlockPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [flocks, setFlocks] = useState<DiscoveredFlock[] | null>(null);
  const [sort, setSort] = useState<Sort>('match');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => (setMe(p), setEditing(!hasBasics(p))))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!me || editing) return;
    discoverFlocks()
      .then(setFlocks)
      .catch((e) => (setError(e.message), setFlocks([])));
  }, [me, editing]);

  if (me && editing)
    return (
      <Basics
        me={me}
        onSaved={(p) => {
          setMe(p);
          setFlocks(null);
          setEditing(false);
        }}
      />
    );

  const spots = (f: DiscoveredFlock) => (f.maxSize ? f.maxSize - f.members.length : Infinity);
  const shown = [...(flocks ?? [])]
    .filter((f) => sort !== 'space' || spots(f) > 0)
    .sort((a, b) => (sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : b.matchPct - a.matchPct));

  return (
    <main className={screen}>
      <StepHeader title="Find a flock" subtitle="Open flocks that fit your budget, beds and dates" />
      <div className="flex items-center gap-2">
        {(
          [
            ['match', 'Best match'],
            ['newest', 'Newest'],
            ['space', 'Has space'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
            className={`rough rounded-[10px] px-3 py-1.5 text-base font-bold whitespace-nowrap ${sort === key ? 'text-card [--fill:var(--color-ink)]' : 'text-ink [--fill:var(--color-surface)]'}`}
          >
            {label}
          </button>
        ))}
        <button onClick={() => setEditing(true)} className="ml-auto text-base font-bold whitespace-nowrap text-accent">
          Your basics
        </button>
      </div>

      {error && <p className="text-base text-danger">{error}</p>}
      {!flocks ? (
        [0, 1, 2].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-lg bg-surface" />)
      ) : shown.length === 0 ? (
        <p className="rough rounded-lg p-4 text-center text-lg text-muted [--fill:var(--color-surface)]">No open flocks right now.</p>
      ) : (
        shown.map((f) => (
          <Link key={f.id} href={`/flocks/${f.id}`} className="rough flex items-center gap-3 rounded-lg px-4 py-3.5 [--fill:var(--color-surface)]">
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
              <span className={`rounded-[7px] px-2.5 py-[3px] text-sm font-bold ${f.passes ? 'bg-accent-soft text-accent' : 'bg-card text-muted'}`}>
                {f.matchPct}% match
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/chevron.svg" alt="" width={20} height={20} />
            </div>
          </Link>
        ))
      )}
      <div className="flex-1" />
      <p className="text-center text-base text-muted">
        Cannot find one?{' '}
        <Link href="/flocks/new?type=open" className="font-bold text-accent">
          Create an open flock
        </Link>
      </p>
    </main>
  );
}

const hasBasics = (p: Profile) => p.budget_max != null && !!p.move_in && !!p.neighborhoods?.length;

// "1 spot · Silver Lake · $2.5-3.5k"
function summary(f: DiscoveredFlock) {
  const left = f.maxSize ? f.maxSize - f.members.length : null;
  const spots = left == null ? `${f.members.length} in flock` : left <= 0 ? 'full' : `${left} ${left === 1 ? 'spot' : 'spots'}`;
  const budget = f.budgetMin != null ? `${shortPrice(f.budgetMin)}–${f.budgetMax != null ? shortPrice(f.budgetMax) : '+'}` : null;
  return [spots, f.area, budget].filter(Boolean).join(' · ');
}

// Your basics, asked once before matching: the join rules compare against them (Figma dev note: asked at join time).
function Basics({ me, onSaved }: { me: Profile; onSaved: (p: Profile) => void }) {
  const initial = BUDGETS.findIndex(([, , max], i) => i > 0 && me.budget_max != null && me.budget_max <= (max ?? Infinity));
  const [budget, setBudget] = useState(initial > 0 ? initial : 2);
  const [areas, setAreas] = useState<string[]>(me.neighborhoods ?? []);
  const [moveIn, setMoveIn] = useState(me.move_in?.slice(0, 10) ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const [, min, max] = BUDGETS[budget]!;
    const prefs = { budget_max: max ?? (min ?? 0) + 1000, neighborhoods: areas, move_in: moveIn };
    setBusy(true);
    try {
      await updatePreferences(prefs);
      onSaved({ ...me, ...prefs });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className={screen} onSubmit={save}>
      <StepHeader title="Your basics" subtitle="Open flocks check these before you can join." />
      <Chips label="Budget per person" options={BUDGETS.slice(1).map(([t], i) => [t, i + 1])} selected={(i) => i === budget} onToggle={setBudget} />
      <Chips
        label="Areas"
        options={LA_AREAS.map((a) => [a, a])}
        selected={(a) => areas.includes(a)}
        onToggle={(a) => setAreas((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]))}
      />
      <Field label="Move-in date" type="date" required value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
      {error && <p className="text-base text-danger">{error}</p>}
      <div className="flex-1" />
      <Button type="submit" disabled={busy || !areas.length || !moveIn}>
        {busy ? 'Saving…' : 'Show flocks'}
      </Button>
    </form>
  );
}
