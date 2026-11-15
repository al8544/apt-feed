'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { discoverFlocks, flockPct, getFlockMatches, getProfile, updatePreferences, type DiscoveredFlock, type FlockMatch, type Profile } from '@/lib/api';
import { BUDGETS, LA_AREAS } from '@/lib/flocks';
import { shortPrice } from '@/lib/format';
import Avatar from '@/components/Avatar';
import { Button, Field } from '@/components/AuthUI';
import { Chips, StepHeader, TextArea, screen } from '@/components/FormUI';

type Sort = 'match' | 'newest' | 'space';
type Step = 'basics' | 'story' | 'results';
// 'loading' while the agent reads, 'failed' when it could not (no key, daily limit, model down): the rule-based list still works.
type Reading = 'loading' | 'ready' | 'failed';


// Figma 00i Find a flock. You answer a few long questions once; an agent reads them against each open flock you already pass the
// rules for and says which you could apply to. Applying is still the Join button on the flock's page.
export default function FindFlockPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [step, setStep] = useState<Step>('results');
  const [flocks, setFlocks] = useState<DiscoveredFlock[] | null>(null);
  const [matches, setMatches] = useState<Map<string, FlockMatch>>(new Map());
  const [reading, setReading] = useState<Reading>('loading');
  const [sort, setSort] = useState<Sort>('match');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => (setMe(p), setStep(nextStep(p))))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!me || step !== 'results') return;
    discoverFlocks()
      .then(setFlocks)
      .catch((e) => (setError(e.message), setFlocks([])));
    getFlockMatches()
      .then((ms) => (setMatches(new Map(ms.map((m) => [m.flockId, m]))), setReading('ready')))
      .catch(() => (setMatches(new Map()), setReading('failed')));
  }, [me, step]);

  // Saving basics or answers sends you back to results with a fresh list and a fresh read.
  const saved = (p: Profile) => {
    setMe(p);
    setFlocks(null);
    setReading('loading');
    setStep(nextStep(p, step));
  };
  if (me && step === 'basics') return <Basics me={me} onSaved={saved} />;
  if (me && step === 'story') return <Story me={me} onSaved={saved} />;

  const spots = (f: DiscoveredFlock) => (f.maxSize ? f.maxSize - f.members.length : Infinity);
  // Same % keeps the same place: ties break on id, so the list never shuffles.
  const byPct = (a: DiscoveredFlock, b: DiscoveredFlock) => flockPct(b) - flockPct(a) || a.id.localeCompare(b.id);
  // Nothing is listed until the agent has scored it: while it reads, only the skeleton shows. If it fails, the basics-only list stands in.
  const scored = reading === 'ready' ? (flocks ?? []).filter((f) => matches.has(f.id)) : reading === 'failed' ? (flocks ?? []) : [];
  const shown = [...scored]
    .filter((f) => sort !== 'space' || spots(f) > 0)
    .sort((a, b) => (sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : byPct(a, b)));

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
      </div>
      <div className="flex justify-end gap-4">
        <button onClick={() => setStep('story')} className="text-base font-bold whitespace-nowrap text-accent">
          Your answers
        </button>
        <button onClick={() => setStep('basics')} className="text-base font-bold whitespace-nowrap text-accent">
          Your basics
        </button>
      </div>

      {reading === 'loading' && <p className="animate-pulse text-base text-muted">Reading what you wrote…</p>}
      {reading === 'failed' && (
        <p className="text-base text-muted">Couldn&apos;t read your answers just now, so this list is ranked by your basics only.</p>
      )}
      {error && <p className="text-base text-danger">{error}</p>}
      {!flocks || reading === 'loading' ? (
        [0, 1, 2].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-lg bg-surface" />)
      ) : shown.length === 0 ? (
        <p className="rough rounded-lg p-4 text-center text-lg text-muted [--fill:var(--color-surface)]">No open flocks right now.</p>
      ) : (
        shown.map((f) => {
          const m = matches.get(f.id);
          return (
            <Link key={f.id} href={`/flocks/${f.id}`} className="rough flex items-center gap-3 rounded-lg px-4 py-3.5 [--fill:var(--color-surface)]">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-[22px] font-bold text-ink">{f.name}</p>
                <p className="truncate text-[15px] text-muted">{summary(f)}</p>
                {m && <p className="text-[15px] text-ink">{m.reason}</p>}
                <div className="flex">
                  {f.members.slice(0, 5).map((p) => (
                    <Avatar key={p.id} user={p} size={28} className="-mr-2 last:mr-0" />
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`rounded-[7px] px-2.5 py-[3px] text-sm font-bold ${(m ? m.fit !== 'weak' : true) && f.passes ? 'bg-accent-soft text-accent' : 'bg-card text-muted'}`}>
                  {flockPct(f)}% match
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/chevron.svg" alt="" width={20} height={20} />
              </div>
            </Link>
          );
        })
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
const hasStory = (p: Profile) => !!p.about?.trim() && !!p.looking_for?.trim();
// First visit walks through basics, then the long answers; after that you land on results and edit either from there.
const nextStep = (p: Profile, from?: Step): Step => (!hasBasics(p) ? 'basics' : !hasStory(p) ? 'story' : from === 'basics' || from === 'story' || !from ? 'results' : from);

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
        {busy ? 'Saving…' : 'Next'}
      </Button>
    </form>
  );
}

// The long answers. An agent reads them against each open flock's own words, so write like you would to a future roommate.
function Story({ me, onSaved }: { me: Profile; onSaved: (p: Profile) => void }) {
  const [about, setAbout] = useState(me.about ?? '');
  const [lookingFor, setLookingFor] = useState(me.looking_for ?? '');
  const [dealbreakers, setDealbreakers] = useState(me.dealbreakers_text ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const prefs = { about: about.trim(), looking_for: lookingFor.trim(), dealbreakers_text: dealbreakers.trim() || null };
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
      <StepHeader title="Tell us what you want" subtitle="Write as much as you like. An agent reads this to find open flocks you could apply to." />
      <TextArea
        label="About you"
        rows={5}
        maxLength={2000}
        placeholder="How do you live? Your schedule, habits, what a good week at home looks like…"
        value={about}
        onChange={(e) => setAbout(e.target.value)}
      />
      <TextArea
        label="What you want in roommates and a home"
        rows={5}
        maxLength={2000}
        placeholder="The vibe, how chores and guests should work, what you'd love to have nearby…"
        value={lookingFor}
        onChange={(e) => setLookingFor(e.target.value)}
      />
      <TextArea
        label="Dealbreakers (optional)"
        rows={3}
        maxLength={2000}
        placeholder="Anything that would make a flock a no."
        value={dealbreakers}
        onChange={(e) => setDealbreakers(e.target.value)}
      />
      {error && <p className="text-base text-danger">{error}</p>}
      <div className="flex-1" />
      <Button type="submit" disabled={busy || !about.trim() || !lookingFor.trim()}>
        {busy ? 'Saving…' : 'Find my flocks'}
      </Button>
    </form>
  );
}
