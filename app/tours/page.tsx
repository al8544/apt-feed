'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { createTour, getGroupMembers, getMapListings, getTours, type GroupListing, type Tour } from '@/lib/api';
import { money, sameDay } from '@/lib/format';
import TourCard from '@/components/TourCard';
import Sheet from '@/components/Sheet';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function ToursPage() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [selected, setSelected] = useState<Date>(today);
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [groupSize, setGroupSize] = useState<number>();
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    getTours(view.year, view.month)
      .then((t) => !cancelled && setTours(t))
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setTours([]);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(load, [load]);
  useEffect(() => {
    getGroupMembers().then((m) => setGroupSize(m.length)).catch(() => {});
  }, []);

  const changeMonth = (delta: number) => {
    setTours(null);
    setView(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  };

  const first = new Date(view.year, view.month - 1, 1);
  const daysInMonth = new Date(view.year, view.month, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.year, view.month - 1, i + 1)),
  ];
  const tourDays = new Set((tours ?? []).map((t) => new Date(t.startsAt).getDate()));
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = (tours ?? []).filter((t) => new Date(t.startsAt) >= startOfToday);

  return (
    <main>
      <header className="flex items-center px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
        <h1 className="flex-1 text-[28px] font-bold tracking-[-0.56px] text-ink">Tours</h1>
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Book a tour"
          className="rough rough-ink flex size-9 items-center justify-center rounded-full text-cream"
        >
          <Plus size={18} strokeWidth={2} />
        </button>
      </header>

      <div className="flex items-center gap-4 px-4 pb-2">
        <h2 className="flex-1 text-[17px] font-semibold text-ink">
          {first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="text-muted">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <button onClick={() => changeMonth(1)} aria-label="Next month" className="text-ink">
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-3">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="py-1.5 text-center text-xs font-semibold text-muted">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((date, i) => {
            if (!date) return <span key={`blank-${i}`} />;
            const isToday = sameDay(date, today);
            const isSelected = sameDay(date, selected);
            const hasTour = tourDays.has(date.getDate());
            return (
              <button key={i} onClick={() => setSelected(date)} className="flex flex-col items-center gap-[3px] py-1">
                <span
                  className={`flex size-9 items-center justify-center rounded-full text-base ${
                    isSelected
                      ? 'rough rough-ink font-bold text-cream'
                      : isToday
                        ? 'font-semibold text-accent'
                        : 'text-ink'
                  }`}
                >
                  {date.getDate()}
                </span>
                <span className={`size-[5px] rounded-full ${hasTour ? 'bg-accent' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1 h-[0.5px] bg-line" />

      <div className="flex items-baseline gap-2 px-4 pt-4 pb-2.5">
        <h2 className="text-[17px] font-semibold text-ink">Upcoming</h2>
        {tours && (
          <span className="text-[13px] text-muted">
            {upcoming.length} {upcoming.length === 1 ? 'tour' : 'tours'} booked
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-6">
        {error && <p className="text-[13px] text-danger">{error}</p>}
        {!tours ? (
          [0, 1, 2].map((i) => <div key={i} className="h-[94px] animate-pulse rounded-[18px] bg-surface" />)
        ) : upcoming.length ? (
          upcoming.map((t) => <TourCard key={t.id} tour={t} groupSize={groupSize} />)
        ) : (
          <p className="rough rough-surface rounded-[18px] p-4 text-center text-[14px] text-muted">
            No tours booked this month. Tap + to book one.
          </p>
        )}
      </div>

      <BookTourSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultDate={selected}
        onBooked={(date) => {
          setSelected(date);
          if (date.getFullYear() === view.year && date.getMonth() + 1 === view.month) load();
          else {
            setTours(null);
            setView({ year: date.getFullYear(), month: date.getMonth() + 1 });
          }
        }}
      />
    </main>
  );
}

function BookTourSheet({
  open,
  onClose,
  defaultDate,
  onBooked,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: Date;
  onBooked: (date: Date) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Book a tour">
      {/* Keyed so the form resets each time the sheet opens. */}
      <BookTourForm key={String(open)} defaultDate={defaultDate} onClose={onClose} onBooked={onBooked} />
    </Sheet>
  );
}

function BookTourForm({
  defaultDate,
  onClose,
  onBooked,
}: {
  defaultDate: Date;
  onClose: () => void;
  onBooked: (date: Date) => void;
}) {
  const [listings, setListings] = useState<GroupListing[] | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [date, setDate] = useState(toInputDate(defaultDate));
  const [time, setTime] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMapListings()
      .then((ls) => setListings([...ls].sort((a, b) => b.likes - a.likes || b.match.pct - a.match.pct)))
      .catch((e) => {
        setError(e.message);
        setListings([]);
      });
  }, []);

  async function book() {
    if (!listingId) return;
    const startsAt = new Date(`${date}T${time}`);
    setSaving(true);
    setError(null);
    try {
      await createTour(listingId, startsAt);
      onBooked(startsAt);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const input = 'w-full rounded-xl bg-surface px-3 py-2.5 text-[15px] text-ink outline-none';

  return (
    <>
      <div className="flex gap-3 pb-3">
        <label className="flex flex-1 flex-col gap-1 text-[13px] text-muted">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[13px] text-muted">
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
        </label>
      </div>
      <p className="pb-1.5 text-[13px] text-muted">Listing</p>
      <div className="flex flex-col gap-1.5 pb-3">
        {!listings
          ? [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />)
          : listings.map((l) => (
              <button
                key={l.id}
                onClick={() => setListingId(l.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left ${
                  listingId === l.id ? 'rough rough-ink text-cream' : 'rough rough-surface text-ink'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{l.address}</p>
                  <p className={`truncate text-[13px] ${listingId === l.id ? 'text-cream/70' : 'text-muted'}`}>
                    {l.neighborhood} · {money(l.price)}
                  </p>
                </div>
                {l.likes > 0 && <span className="text-xs font-semibold text-accent">♥ {l.likes}</span>}
              </button>
            ))}
      </div>
      {error && <p className="pb-2 text-[13px] text-danger">{error}</p>}
      <button
        onClick={book}
        disabled={!listingId || saving}
        className="rough rough-ink sticky bottom-0 w-full rounded-xl py-3 text-[16px] font-bold text-cream disabled:opacity-40"
      >
        {saving ? 'Booking…' : 'Book tour'}
      </button>
    </>
  );
}
