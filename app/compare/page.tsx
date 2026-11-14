'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CURRENT_USER_ID, getGroupMembers, getMapListings, type GroupListing } from '@/lib/api';
import { money } from '@/lib/format';
import {
  METRICS,
  evenWeights,
  flockScore,
  metricValue,
  setWeight,
  toggleWeight,
  yourScores,
  type MetricKey,
  type Weights,
} from '@/lib/compare';
import ListingPhoto from '@/components/ListingPhoto';
import NavBar from '@/components/NavBar';
import Icon from '@/components/Icon';
import Sheet from '@/components/Sheet';
import Toggle from '@/components/Toggle';

type Prefs = { weights: Weights; showScore: boolean };
const ALL_KEYS = METRICS.map((m) => m.key);
const DEFAULT_PREFS: Prefs = { weights: evenWeights(ALL_KEYS), showScore: true };

// shortcut: weights live in this browser (per user id), not the database. Move to profiles if they
// need to follow the user across devices.
const prefsKey = () => `aptHunt.compare.${CURRENT_USER_ID}`;
function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(prefsKey());
    const p = raw ? (JSON.parse(raw) as Prefs) : null;
    if (p && p.weights && Object.keys(p.weights).every((k) => ALL_KEYS.includes(k as MetricKey))) return p;
  } catch {
    /* storage blocked or bad data: use defaults */
  }
  return DEFAULT_PREFS;
}
function savePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(prefsKey(), JSON.stringify(p));
  } catch {
    /* storage blocked: keep for this visit only */
  }
}

// Figma "08 Compare".
export default function ComparePage() {
  const router = useRouter();
  const params = useSearchParams();
  const ids = useMemo(() => (params.get('ids') ?? '').split(',').filter(Boolean), [params]);
  const [all, setAll] = useState<GroupListing[] | null>(null);
  const [groupSize, setGroupSize] = useState(0);
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [highlight, setHighlight] = useState(true);
  const [diffOnly, setDiffOnly] = useState(false);
  const [byScore, setByScore] = useState(false);
  const [sheet, setSheet] = useState<'metrics' | 'weights' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMapListings()
      .then(setAll)
      .catch((e) => (setError(e.message), setAll([])));
    getGroupMembers().then((m) => setGroupSize(m.length)).catch(() => {});
  }, []);

  const setPrefs = (p: Prefs) => (setPrefsState(p), savePrefs(p));
  const places = ids.map((id) => all?.find((l) => l.id === id)).filter((l): l is GroupListing => !!l);
  const scores = yourScores(places, prefs.weights, groupSize);
  const flockRank = [...places].sort((a, b) => flockScore(b, groupSize) - flockScore(a, groupSize)).map((l) => l.id);
  const order = places.map((l, i) => ({ l, score: scores[i]! }));
  if (byScore) order.sort((a, b) => b.score - a.score);

  const shownMetrics = METRICS.filter((m) => m.key in prefs.weights);
  const rows = [
    ...(prefs.showScore ? [{ key: 'you' as const, label: 'Your score' }] : []),
    ...shownMetrics.map((m) => ({ key: m.key, label: m.label })),
  ].filter((r) => {
    if (!diffOnly || r.key === 'you') return true;
    return new Set(places.map((l) => metricValue(r.key, l, groupSize))).size > 1;
  });

  // Best value per metric gets the green pill (only when places actually differ).
  const isBest = (key: MetricKey | 'you', l: GroupListing, score: number) => {
    if (!highlight || places.length < 2) return false;
    const vals = key === 'you' ? scores : places.map((p) => metricValue(key, p, groupSize));
    if (new Set(vals).size < 2) return false;
    const lower = key !== 'you' && METRICS.find((m) => m.key === key)?.lowerIsBetter;
    const best = lower ? Math.min(...vals) : Math.max(...vals);
    return (key === 'you' ? score : metricValue(key, l, groupSize)) === best;
  };

  const remove = (id: string) => router.replace(`/compare?ids=${ids.filter((x) => x !== id).join(',')}`);
  const pickHref = `/compare/pick?ids=${ids.join(',')}`;

  return (
    <main className="min-h-dvh bg-surface">
      <NavBar
        title="Compare"
        right={
          <button onClick={() => setSheet('metrics')} aria-label="Compare metrics" className="text-ink">
            <Icon name="settings" />
          </button>
        }
      />

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-1.5 pb-3.5">
        {(
          [
            ['Highlight best', highlight, setHighlight],
            ['Differences only', diffOnly, setDiffOnly],
            ['By score', byScore, setByScore],
          ] as const
        ).map(([label, on, set]) => (
          <button
            key={label}
            onClick={() => set(!on)}
            aria-pressed={on}
            className={`rough shrink-0 rounded-full px-3.5 py-1.5 text-base font-bold whitespace-nowrap ${on ? 'text-card [--fill:var(--color-ink)]' : 'text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="px-4 pb-2 text-[15px] text-danger">{error}</p>}

      {!all ? (
        <div className="mx-4 h-[500px] animate-pulse rounded-[20px] bg-card" />
      ) : places.length === 0 ? (
        <div className="rough mx-4 flex flex-col items-center gap-2 rounded-[20px] p-8 text-center">
          <p className="text-xl font-bold text-ink">Nothing to compare yet</p>
          <Link href={pickHref} className="rough rounded-full px-4 py-2 text-lg font-bold text-card [--fill:var(--color-ink)]">
            Pick places
          </Link>
        </div>
      ) : (
        <div className="flex pb-6 pl-4">
          {/* Metric labels */}
          <div className="w-[88px] shrink-0">
            <div className="flex h-[167px] flex-col justify-end pb-3">
              <p className="text-lg font-bold text-ink">
                {places.length} {places.length === 1 ? 'place' : 'places'}
              </p>
              {places.length > 2 && <p className="text-[13px] text-muted">swipe →</p>}
              <Link href={pickHref} className="text-[15px] font-bold text-accent underline">
                + Edit picks
              </Link>
            </div>
            {rows.map((r) =>
              r.key === 'you' ? (
                <button
                  key={r.key}
                  onClick={() => setSheet('weights')}
                  className="flex h-11 w-full flex-col justify-center border-t border-line text-left font-bold"
                >
                  <span className="text-[15px] text-ink">Your score</span>
                  <span className="text-[13px] text-accent">tune weights ›</span>
                </button>
              ) : (
                <div key={r.key} className="flex h-11 items-center border-t border-line text-[15px] text-muted">
                  {r.label}
                </div>
              ),
            )}
          </div>

          {/* Place columns (scroll sideways) */}
          <div className="no-scrollbar flex min-w-0 flex-1 gap-2.5 overflow-x-auto pr-4">
            {order.map(({ l, score }) => (
              <div key={l.id} className="rough w-[124px] shrink-0 rounded-[20px]">
                <ListingPhoto listing={l} className="h-[88px] w-full rounded-t-[20px]">
                  <span className="rough absolute top-2 left-2 rounded-full px-2 py-[3px] text-[13px] font-bold text-accent">
                    #{flockRank.indexOf(l.id) + 1}
                  </span>
                  <button
                    onClick={() => remove(l.id)}
                    aria-label={`Remove ${l.address}`}
                    className="rough absolute top-2 right-2 flex size-[22px] items-center justify-center rounded-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/close-sm.svg" alt="" width={10} height={10} />
                  </button>
                </ListingPhoto>
                {/* 88px photo + 79px header = the 167px label header, so rows line up. */}
                <div className="h-[79px] overflow-hidden px-2.5 pt-1.5 leading-tight">
                  <p className="text-xl font-bold text-ink">{money(l.price)}</p>
                  <p className="truncate text-sm text-muted">{l.address}</p>
                  <p className="truncate text-sm text-muted">{l.neighborhood}</p>
                </div>
                {rows.map((r) => (
                  <div key={r.key} className="flex h-11 items-center justify-center border-t border-line">
                    <Cell metric={r.key} listing={l} score={score} groupSize={groupSize} best={isBest(r.key, l, score)} />
                  </div>
                ))}
              </div>
            ))}
            {places.length < 4 && (
              <Link
                href={pickHref}
                className="flex h-[167px] w-[124px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[20px] border-[1.5px] border-dashed border-[#c9b391]"
              >
                <span className="rough flex size-10 items-center justify-center rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/plus.svg" alt="" width={18} height={18} />
                </span>
                <span className="text-[15px] font-bold text-ink">Add a place</span>
                <span className="text-[13px] text-muted">from picks or stash</span>
              </Link>
            )}
          </div>
        </div>
      )}

      <MetricsSheet open={sheet === 'metrics'} prefs={prefs} onChange={setPrefs} onClose={() => setSheet(null)} onWeights={() => setSheet('weights')} />
      <WeightsSheet
        open={sheet === 'weights'}
        prefs={prefs}
        places={places}
        groupSize={groupSize}
        onSave={(weights) => (setPrefs({ ...prefs, weights }), setSheet(null))}
        onClose={() => setSheet(null)}
      />
    </main>
  );
}

function Cell({
  metric,
  listing: l,
  score,
  groupSize,
  best,
}: {
  metric: MetricKey | 'you';
  listing: GroupListing;
  score: number;
  groupSize: number;
  best: boolean;
}) {
  const big = metric === 'you' || metric === 'flockScore';
  const tone = best ? 'bg-accent-soft text-accent' : metric === 'flockScore' ? 'text-accent' : 'text-ink';
  let content: React.ReactNode;
  switch (metric) {
    case 'you':
      content = score;
      break;
    case 'rent':
      content = money(l.price);
      break;
    case 'bedBath':
      content = `${l.beds} / ${l.baths}`;
      break;
    case 'sqft':
      content = l.sqft.toLocaleString('en-US');
      break;
    case 'ppsf':
      content = l.sqft ? `$${(l.price / l.sqft).toFixed(2)}` : '–';
      break;
    case 'flockScore':
      content = flockScore(l, groupSize);
      break;
    case 'votes':
      content = (
        <>
          <span className="h-[5px] w-9 overflow-hidden rounded-[3px] bg-surface">
            <span className="block h-full rounded-[3px] bg-accent" style={{ width: `${groupSize ? (l.likes / groupSize) * 100 : 0}%` }} />
          </span>
          <span className="text-[15px] text-accent">
            {l.likes}/{groupSize}
          </span>
        </>
      );
      break;
    case 'pets':
      content = l.pets ? 'Yes' : <span className="text-faded">No</span>;
      break;
  }
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-[9px] py-0.5 font-bold whitespace-nowrap ${big ? 'text-xl' : 'text-base'} ${tone}`}>
      {content}
    </span>
  );
}

// Figma "08b Compare · Metrics".
function MetricsSheet({
  open,
  prefs,
  onChange,
  onClose,
  onWeights,
}: {
  open: boolean;
  prefs: Prefs;
  onChange: (p: Prefs) => void;
  onClose: () => void;
  onWeights: () => void;
}) {
  const on = Object.keys(prefs.weights).length + (prefs.showScore ? 1 : 0);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Compare metrics"
      subtitle={`Pick what to line up · ${on} of ${METRICS.length + 1} on`}
      action={<button onClick={() => onChange(DEFAULT_PREFS)}>Reset</button>}
      footer={
        <button onClick={onClose} className="rough h-[52px] w-full rounded-full text-xl font-bold text-card [--fill:var(--color-ink)]">
          Done
        </button>
      }
    >
      <div className="rough rounded-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <div className="flex-1">
            <p className="text-lg text-ink">Your score</p>
            <p className="text-sm text-muted">custom weights</p>
          </div>
          <button onClick={onWeights} className="text-base font-bold text-accent">
            Weights ›
          </button>
          <Toggle on={prefs.showScore} onChange={(showScore) => onChange({ ...prefs, showScore })} label="Your score" />
        </div>
        {METRICS.map((m, i) => {
          const isOn = m.key in prefs.weights;
          const last = Object.keys(prefs.weights).length === 1 && isOn; // keep at least one metric
          return (
            <div key={m.key} className={`flex h-[46px] items-center gap-2 px-4 ${i < METRICS.length - 1 ? 'border-b border-line' : ''}`}>
              <span className={`flex-1 text-lg ${isOn ? 'text-ink' : 'text-muted'}`}>{m.label}</span>
              <Toggle
                on={isOn}
                onChange={(v) => !last && onChange({ ...prefs, weights: toggleWeight(prefs.weights, m.key, v) })}
                label={m.label}
              />
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

// Figma "08c Compare · Your Score".
function WeightsSheet({
  open,
  prefs,
  places,
  groupSize,
  onSave,
  onClose,
}: {
  open: boolean;
  prefs: Prefs;
  places: GroupListing[];
  groupSize: number;
  onSave: (w: Weights) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Your score" subtitle="Drag what matters · total stays 100%">
      <WeightsEditor initial={prefs.weights} places={places} groupSize={groupSize} onSave={onSave} />
    </Sheet>
  );
}

function WeightsEditor({
  initial,
  places,
  groupSize,
  onSave,
}: {
  initial: Weights;
  places: GroupListing[];
  groupSize: number;
  onSave: (w: Weights) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [active, setActive] = useState<MetricKey | null>(null);

  const keys = METRICS.filter((m) => m.key in draft);
  const even = 1 / Math.max(1, keys.length);
  const scores = yourScores(places, draft, groupSize);
  const ranking = places.map((l, i) => ({ l, s: scores[i]! })).sort((a, b) => b.s - a.s);

  return (
      <div className="flex flex-col gap-3 pb-1">
        <button
          onClick={() => setDraft(evenWeights(keys.map((m) => m.key)))}
          className="-mt-2 self-end text-lg font-bold text-accent"
        >
          Even out
        </button>
        <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
          {keys.map((m, i) => (
            <span
              key={m.key}
              className={m.key === active ? 'bg-accent' : i % 2 ? 'bg-tan/50' : 'bg-tan/35'}
              style={{ width: `${(draft[m.key] ?? 0) * 100}%` }}
            />
          ))}
        </div>

        <div className="rough rounded-2xl">
          {keys.map((m, i) => {
            const w = draft[m.key] ?? 0;
            const diff = w - even;
            return (
              <div
                key={m.key}
                className={`flex h-[41px] items-center gap-3 px-4 ${i < keys.length - 1 ? 'border-b border-line' : ''} ${m.key === active ? 'bg-accent-soft/60' : ''}`}
              >
                <span className="w-[100px] shrink-0 text-lg text-ink">{m.label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(w * 100)}
                  aria-label={`${m.label} weight`}
                  onChange={(e) => {
                    setActive(m.key);
                    setDraft((d) => setWeight(d, m.key, Number(e.target.value) / 100));
                  }}
                  className="range-knob h-[26px] min-w-0 flex-1 appearance-none rounded-full bg-transparent"
                  style={{
                    background: `linear-gradient(to right, var(--color-accent) ${w * 100}%, var(--color-line) ${w * 100}%) center / 100% 4px no-repeat`,
                  }}
                />
                <span className={`w-12 shrink-0 text-right text-base font-bold ${m.key === active ? 'text-accent' : 'text-ink'}`}>
                  {Math.abs(diff) > 0.005 && m.key !== active ? (diff < 0 ? '↓' : '↑') : ''}
                  {Math.round(w * 100)}%
                </span>
              </div>
            );
          })}
        </div>

        {ranking.length > 0 && (
          <>
            <p className="pt-1 text-sm font-bold tracking-[0.56px] text-muted uppercase">Live ranking</p>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {ranking.map(({ l, s }, i) => (
                <span
                  key={l.id}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[15px] whitespace-nowrap ${i === 0 ? 'bg-accent-soft text-accent' : 'bg-card text-ink'}`}
                >
                  {i + 1} {l.address.split(' ').slice(1, 2).join(' ') || l.address} {s}
                </span>
              ))}
            </div>
          </>
        )}
        <button
          onClick={() => onSave(draft)}
          className="rough mt-1 h-[52px] w-full shrink-0 rounded-full text-xl font-bold text-card [--fill:var(--color-ink)]"
        >
          Use my weights
        </button>
      </div>
  );
}
