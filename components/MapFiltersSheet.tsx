'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { GroupListing } from '@/lib/api';
import { money } from '@/lib/format';
import Toggle from './Toggle';

// Only filters the listing data can answer. Home type and amenities (laundry, doorman, ...) from the
// Figma sheet are left out until listings carry those fields.
export type Filters = {
  minPrice: number | null;
  maxPrice: number | null;
  minBeds: number; // 0 = any, -1 = studio only
  minBaths: number; // 0 = any
  likedByFlock: boolean;
  hideNoped: boolean;
  showStashed: boolean;
  pets: boolean;
  query: string; // from the map search bar: address or neighborhood contains this
};

// Search-bar text match on address or neighborhood (case-insensitive).
export const matchesQuery = (l: Pick<GroupListing, 'address' | 'neighborhood'>, q: string) =>
  `${l.address} ${l.neighborhood}`.toLowerCase().includes(q.trim().toLowerCase());

export const NO_FILTERS: Filters = {
  minPrice: null,
  maxPrice: null,
  minBeds: 0,
  minBaths: 0,
  likedByFlock: false,
  hideNoped: false,
  showStashed: true,
  pets: false,
  query: '',
};

export function applyFilters(
  listings: GroupListing[],
  f: Filters,
  mine: { swipes: Map<string, 'left' | 'right'>; stashed: Set<string> },
) {
  return listings.filter(
    (l) =>
      (f.minPrice == null || l.price >= f.minPrice) &&
      (f.maxPrice == null || l.price <= f.maxPrice) &&
      (f.minBeds === -1 ? l.beds === 0 : l.beds >= f.minBeds) &&
      l.baths >= f.minBaths &&
      (!f.likedByFlock || l.likes > 0) &&
      (!f.hideNoped || mine.swipes.get(l.id) !== 'left') &&
      (f.showStashed || !mine.stashed.has(l.id)) &&
      (!f.pets || l.pets) &&
      (!f.query.trim() || matchesQuery(l, f.query)),
  );
}

const BEDS: [number, string][] = [[0, 'Any'], [-1, 'Studio'], [1, '1+'], [2, '2+'], [3, '3+'], [4, '4+']];
const BATHS: [number, string][] = [[0, 'Any'], [1, '1+'], [1.5, '1.5+'], [2, '2+'], [3, '3+']];
const BUCKETS = 24;
const STEP = 50;

export default function MapFiltersSheet({
  open,
  value,
  listings,
  mine,
  onClose,
  onApply,
}: {
  open: boolean;
  value: Filters;
  listings: GroupListing[];
  mine: Parameters<typeof applyFilters>[2];
  onClose: () => void;
  onApply: (f: Filters) => void;
}) {
  // Portal: the map screen is position:fixed, which would trap this sheet under the bottom nav.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && <FiltersBody value={value} listings={listings} mine={mine} onClose={onClose} onApply={onApply} />}
    </AnimatePresence>,
    document.body,
  );
}

// Mounted only while open, so the draft starts from the applied filters each time.
function FiltersBody({
  value,
  listings,
  mine,
  onClose,
  onApply,
}: {
  value: Filters;
  listings: GroupListing[];
  mine: Parameters<typeof applyFilters>[2];
  onClose: () => void;
  onApply: (f: Filters) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));
  const prices = listings.map((l) => l.price);
  const lo = Math.floor(Math.min(...prices, 1000) / STEP) * STEP;
  const hi = Math.ceil(Math.max(...prices, 5000) / STEP) * STEP;
  const min = draft.minPrice ?? lo;
  const max = draft.maxPrice ?? hi;
  const count = applyFilters(listings, draft, mine).length;

  // Histogram of real listing prices; bars inside the chosen range are dark.
  const width = (hi - lo) / BUCKETS;
  const counts = Array.from({ length: BUCKETS }, (_, i) => prices.filter((p) => Math.min(BUCKETS - 1, Math.floor((p - lo) / width)) === i).length);
  const peak = Math.max(1, ...counts);
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <motion.button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0, transition: { type: 'spring', damping: 30, stiffness: 320 } }}
        exit={{ y: '100%', transition: { duration: 0.2, ease: 'easeIn' } }}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="rough absolute bottom-0 flex h-[min(760px,90dvh)] w-full max-w-[430px] flex-col rounded-t-[10px]"
      >
        <div className="flex shrink-0 flex-col items-center gap-1.5 pt-2.5 pb-1.5">
          <div className="h-[5px] w-10 rounded-[3px] bg-line" />
          <div className="flex w-full items-center justify-between px-5">
            <button onClick={() => setDraft({ ...NO_FILTERS, query: draft.query })} className="w-[60px] text-left text-lg text-muted underline">
              Reset
            </button>
            <h2 className="text-2xl font-bold text-ink">Filters</h2>
            <button onClick={onClose} aria-label="Close filters" className="flex w-[60px] justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/close.svg" alt="" width={22} height={22} />
            </button>
          </div>
        </div>
        <div className="h-px shrink-0 bg-line" />

        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[26px] overflow-y-auto px-4 pt-[18px] pb-6">
          <section className="flex flex-col gap-3">
            <Heading title="Price" note="per month" />
            <div className="flex h-11 items-end gap-[3px] px-[1.5px]" aria-hidden>
              {counts.map((c, i) => {
                const mid = lo + (i + 0.5) * width;
                const inRange = mid >= min && mid <= max;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-[3px] ${inRange ? 'bg-accent opacity-85' : 'bg-accent-soft'}`}
                    style={{ height: `${Math.max(4, (c / peak) * 44)}px` }}
                  />
                );
              })}
            </div>
            {/* Two native range inputs over one track: keyboard and screen-reader friendly. */}
            <div className="relative h-[26px]">
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
              <div
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
                style={{ left: `${pct(min)}%`, right: `${100 - pct(max)}%` }}
              />
              {(['min', 'max'] as const).map((k) => (
                <input
                  key={k}
                  type="range"
                  aria-label={k === 'min' ? 'Minimum price' : 'Maximum price'}
                  min={lo}
                  max={hi}
                  step={STEP}
                  value={k === 'min' ? min : max}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (k === 'min') set({ minPrice: Math.min(v, max) === lo ? null : Math.min(v, max) });
                    else set({ maxPrice: Math.max(v, min) === hi ? null : Math.max(v, min) });
                  }}
                  className="range-knob pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <PriceBox label="Min" value={min} />
              <span className="text-xl font-bold text-muted">–</span>
              <PriceBox label="Max" value={max} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <Heading title="Bedrooms" />
            <Pills options={BEDS} value={draft.minBeds} onChange={(minBeds) => set({ minBeds })} label="Bedrooms" />
          </section>

          <section className="flex flex-col gap-3">
            <Heading title="Bathrooms" />
            <Pills options={BATHS} value={draft.minBaths} onChange={(minBaths) => set({ minBaths })} label="Bathrooms" />
          </section>

          <section className="flex flex-col gap-1">
            <Heading title="Flock" />
            <Row label="Only homes my flock liked" on={draft.likedByFlock} onChange={(likedByFlock) => set({ likedByFlock })} />
            <Row label="Hide homes I noped" on={draft.hideNoped} onChange={(hideNoped) => set({ hideNoped })} />
            <Row label="Show stashed homes" on={draft.showStashed} onChange={(showStashed) => set({ showStashed })} />
          </section>

          <section className="flex flex-col gap-1">
            <Heading title="Must-haves" />
            <Row label="Pets OK" on={draft.pets} onChange={(pets) => set({ pets })} />
          </section>
        </div>

        <div className="h-px shrink-0 bg-line" />
        <div className="shrink-0 px-4 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <button
            onClick={() => onApply(draft)}
            className="rough w-full rounded-md py-3.5 text-xl font-bold text-card [--fill:var(--color-ink)]"
          >
            Show {count} {count === 1 ? 'home' : 'homes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      {note && <span className="text-[15px] text-muted">{note}</span>}
    </div>
  );
}

function PriceBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rough flex flex-1 flex-col rounded-md px-3.5 py-2 [--fill:var(--color-surface)]">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-[19px] font-bold text-ink">{money(value)}</span>
    </div>
  );
}

// Figma "Filter Pill".
function Pills({
  options,
  value,
  onChange,
  label,
}: {
  options: [number, string][];
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {options.map(([v, text]) => (
        <button
          key={text}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rough flex-1 rounded-[9px] py-2 text-base font-bold whitespace-nowrap ${
            value === v ? 'text-card [--fill:var(--color-ink)]' : 'text-ink [--fill:var(--color-surface)]'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex h-[46px] items-center gap-2 border-b border-line px-4">
      <span className="flex-1 text-lg text-ink">{label}</span>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  );
}
