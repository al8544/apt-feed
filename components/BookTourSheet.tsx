'use client';
import { useEffect, useMemo, useState } from 'react';
import { createTour, getGroupMembers, getTours, type Listing, type Member, type Tour } from '@/lib/api';
import { firstName, initials } from '@/lib/format';
import Sheet from './Sheet';

// shortcut: listings have no agent or open-house data yet, so the agent and the open tour times
// are generated per listing. Replace with real agent availability when the listings import has it.
const AGENTS = [
  ['Dana Reyes', 'Corcoran'],
  ['Luis Ortega', 'Compass'],
  ['Hana Park', 'Douglas Elliman'],
] as const;
const SLOTS = [
  [2, 18, 0, 30],
  [5, 12, 30, 30],
  [7, 10, 0, 30],
  [8, 13, 0, 45],
  [10, 17, 30, 30],
] as const; // [days from today, hour, minute, minutes long]

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function openSlots(listingId: string) {
  const shift = hash(listingId) % 2; // so not every listing has the same days
  const today = new Date();
  return SLOTS.map(([days, h, m, mins]) => ({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + days + shift, h, m),
    mins,
  }));
}

// A member is busy if they're already on another tour within an hour of this slot.
function busyMembers(start: Date, members: Member[], tours: Tour[]) {
  const t = start.getTime();
  const busy = new Set(
    tours
      .filter((x) => Math.abs(new Date(x.startsAt).getTime() - t) < 3600_000)
      .flatMap((x) => x.attendees.map((a) => a.id)),
  );
  return members.filter((m) => busy.has(m.id));
}

export default function BookTourSheet({
  listing,
  onClose,
  onBooked,
}: {
  listing: Listing | null;
  onClose: () => void;
  onBooked: (tourId: string, startsAt: Date) => void;
}) {
  return (
    <Sheet
      open={!!listing}
      onClose={onClose}
      title="Book a tour"
      subtitle={listing ? `${listing.address} · ${listing.neighborhood}` : ''}
    >
      {listing && <Slots key={listing.id} listing={listing} onBooked={onBooked} />}
    </Sheet>
  );
}

function Slots({ listing, onBooked }: { listing: Listing; onBooked: (tourId: string, startsAt: Date) => void }) {
  const slots = useMemo(() => openSlots(listing.id), [listing.id]);
  const [agentName, agency] = AGENTS[hash(listing.id) % AGENTS.length]!;
  const [members, setMembers] = useState<Member[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGroupMembers().then(setMembers).catch(() => {});
    // Slots can spill into next month.
    const months = new Set(slots.map((s) => `${s.start.getFullYear()}-${s.start.getMonth() + 1}`));
    Promise.all([...months].map((k) => getTours(+k.split('-')[0]!, +k.split('-')[1]!)))
      .then((r) => setTours(r.flat()))
      .catch(() => {});
  }, [slots]);

  async function add() {
    if (picked == null) return;
    const { start } = slots[picked]!;
    setSaving(true);
    setError(null);
    try {
      onBooked(await createTour(listing.id, start), start);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-1">
      <div className="rough flex items-center gap-3 rounded-2xl px-3.5 py-2.5 [--fill:var(--color-surface)]">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-tan text-lg font-bold text-ink">
          {initials(agentName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-ink">{agentName}</p>
          <p className="text-[15px] text-muted">Listing agent · {agency}</p>
        </div>
        <span className="rounded-full bg-card px-2.5 py-[3px] text-sm font-bold text-ink">{slots.length} open</span>
      </div>

      <div className="flex items-baseline">
        <h3 className="flex-1 text-xl font-bold text-ink">Open tour times</h3>
        <span className="text-[15px] text-muted">flock free?</span>
      </div>

      <div role="radiogroup" aria-label="Open tour times" className="flex flex-col gap-2">
        {slots.map(({ start, mins }, i) => {
          const busy = busyMembers(start, members, tours);
          const free = members.length - busy.length;
          const allFree = members.length > 0 && busy.length === 0;
          const label = !members.length
            ? '…'
            : allFree
              ? `all ${members.length} free`
              : busy.length === 1
                ? `${firstName(busy[0]!)} busy`
                : `${free}/${members.length} free`;
          const selected = picked === i;
          return (
            <button
              key={i}
              role="radio"
              aria-checked={selected}
              onClick={() => setPicked(i)}
              className={`rough flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left ${
                selected ? 'outline-2 -outline-offset-2 outline-ink [--fill:var(--color-card)]' : '[--fill:var(--color-surface)]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected ? '/icons/radio-on.svg' : '/icons/radio.svg'} alt="" width={22} height={22} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-ink">
                  {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-[15px] text-muted">
                  {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {mins} min
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-[3px] text-sm font-bold ${
                  allFree || busy.length === 0 ? 'bg-accent-soft text-accent' : 'bg-card text-muted'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-[15px] text-danger">{error}</p>}
      <button
        onClick={add}
        disabled={picked == null || saving}
        className="rough h-[52px] w-full shrink-0 rounded-full text-xl font-bold text-card [--fill:var(--color-ink)] disabled:opacity-35"
      >
        {saving ? 'Adding…' : picked == null ? 'Pick a time' : 'Add to flock calendar'}
      </button>
    </div>
  );
}
