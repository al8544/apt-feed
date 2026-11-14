'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getGroupMembers, getMapListings, getTours, type GroupListing, type Tour } from '@/lib/api';
import { money, sameDay, area } from '@/lib/format';
import TourCard from '@/components/TourCard';
import Sheet from '@/components/Sheet';
import BookTourSheet from '@/components/BookTourSheet';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function addedMessage(at: Date) {
  const day = at.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  const time = at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `Added ${day} · ${time} — flock notified`;
}

export default function ToursPage() {
  const params = useSearchParams();
  const today = useMemo(() => new Date(), []);
  // Arriving from "Add to flock calendar": open on that tour's month and highlight its day.
  const addedAt = useMemo(() => {
    const at = params.get('at');
    const d = at ? new Date(at) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  }, [params]);
  const start = addedAt ?? today;
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() + 1 });
  const [selected, setSelected] = useState<Date>(today);
  const [mode, setMode] = useState<'week' | 'month'>('month');
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [groupSize, setGroupSize] = useState<number>();
  const [error, setError] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [touring, setTouring] = useState<GroupListing | null>(null);
  const [toast, setToast] = useState<string | null>(() => (addedAt ? addedMessage(addedAt) : null));

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const changeMonth = (delta: number) => {
    setTours(null);
    setView(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  };
  // Week view: the arrows move the selected day by a week and load that day's month.
  const changeWeek = (delta: number) => {
    const d = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + 7 * delta);
    setSelected(d);
    if (d.getFullYear() !== view.year || d.getMonth() + 1 !== view.month) {
      setTours(null);
      setView({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
  };
  const pickMode = (m: 'week' | 'month') => {
    // A week must belong to the loaded month, so jump to its first day if the selection is elsewhere.
    if (m === 'week' && (selected.getFullYear() !== view.year || selected.getMonth() + 1 !== view.month))
      setSelected(new Date(view.year, view.month - 1, 1));
    setMode(m);
  };

  const first = new Date(view.year, view.month - 1, 1);
  const daysInMonth = new Date(view.year, view.month, 0).getDate();
  const weekStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - selected.getDay());
  const cells: (Date | null)[] =
    mode === 'week'
      ? Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i))
      : [
          ...Array<null>(first.getDay()).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.year, view.month - 1, i + 1)),
        ];
  // shortcut: only the loaded month has tours, so a week that crosses into the next month shows no dots there; load by date range if that matters.
  const tourDays = new Set((tours ?? []).map((t) => new Date(t.startsAt).toDateString()));
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const label =
    mode === 'week'
      ? `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${
          weekEnd.getMonth() === weekStart.getMonth() ? weekEnd.getDate() : weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }`
      : first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const step = mode === 'week' ? changeWeek : changeMonth;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = (tours ?? []).filter((t) => new Date(t.startsAt) >= startOfToday);
  const onSelectedDay = (tours ?? []).filter((t) => sameDay(new Date(t.startsAt), selected));

  return (
    <main className="min-h-dvh bg-card">
      <header className="flex items-center px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
        <h1 className="flex-1 text-[33px] font-bold text-ink">Tours</h1>
        <div role="group" aria-label="Calendar view" className="mr-3 flex overflow-hidden rounded-[9px] border-[1.5px] border-line bg-surface">
          {(['week', 'month'] as const).map((m) => (
            <button
              key={m}
              onClick={() => pickMode(m)}
              aria-pressed={mode === m}
              className={`px-3 py-[5px] text-[17px] font-bold capitalize ${mode === m ? 'bg-ink text-card' : 'text-ink'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <button onClick={() => setPickOpen(true)} aria-label="Book a tour">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/add-tour.svg" alt="" width={38} height={38} />
        </button>
      </header>

      <div className="flex items-center gap-4 px-4 pb-2">
        <h2 className="flex-1 text-xl font-bold text-ink">
          {label}
        </h2>
        <button onClick={() => step(-1)} aria-label={`Previous ${mode}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/left.svg" alt="" width={20} height={20} />
        </button>
        <button onClick={() => step(1)} aria-label={`Next ${mode}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/right.svg" alt="" width={20} height={20} />
        </button>
      </div>

      <div className="px-3">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="py-1.5 text-center text-sm font-bold text-muted">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((date, i) => {
            if (!date) return <span key={`blank-${i}`} />;
            const isToday = sameDay(date, today);
            const isSelected = sameDay(date, selected);
            const isAdded = !!addedAt && sameDay(date, addedAt);
            const hasTour = tourDays.has(date.toDateString());
            return (
              <button key={i} onClick={() => setSelected(date)} className="flex flex-col items-center gap-[3px] py-1">
                <span
                  className={`flex size-9 items-center justify-center rounded-[9px] text-[19px] ${
                    isAdded
                      ? 'border-2 border-accent bg-accent-soft text-accent'
                      : isSelected
                        ? 'bg-ink font-bold text-card'
                        : isToday
                          ? 'font-bold text-accent'
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

      <div className="h-[0.5px] bg-line" />

      {onSelectedDay.length > 0 && (
        <>
          <div className="flex items-baseline gap-2 px-4 pt-4 pb-2.5">
            <h2 className="text-xl font-bold text-ink">
              {selected.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </h2>
            <span className="text-[15px] text-muted">
              {onSelectedDay.length} {onSelectedDay.length === 1 ? 'tour' : 'tours'}
            </span>
          </div>
          <div className="flex flex-col gap-2.5 px-4">
            {onSelectedDay.map((t) => (
              <TourCard key={t.id} tour={t} groupSize={groupSize} />
            ))}
          </div>
        </>
      )}

      <div className="flex items-baseline gap-2 px-4 pt-4 pb-2.5">
        <h2 className="text-xl font-bold text-ink">Upcoming</h2>
        {tours && (
          <span className="text-[15px] text-muted">
            {upcoming.length} {upcoming.length === 1 ? 'tour' : 'tours'} booked
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-6">
        {error && <p className="text-[15px] text-danger">{error}</p>}
        {!tours ? (
          [0, 1, 2].map((i) => <div key={i} className="h-[94px] animate-pulse rounded-[7px] bg-surface" />)
        ) : upcoming.length ? (
          upcoming.map((t) => <TourCard key={t.id} tour={t} groupSize={groupSize} />)
        ) : (
          <p className="rough rounded-[7px] p-4 text-center text-base text-muted [--fill:var(--color-surface)]">
            No tours booked this month. Tap + to book one.
          </p>
        )}
      </div>

      <PickListingSheet open={pickOpen} onClose={() => setPickOpen(false)} onPick={(l) => (setPickOpen(false), setTouring(l))} />
      <BookTourSheet
        listing={touring}
        onClose={() => setTouring(null)}
        onBooked={(_, at) => {
          setTouring(null);
          setSelected(at);
          setToast(addedMessage(at));
          if (at.getFullYear() === view.year && at.getMonth() + 1 === view.month) load();
          else {
            setTours(null);
            setView({ year: at.getFullYear(), month: at.getMonth() + 1 });
          }
        }}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="rough fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-[9px] px-[18px] py-2.5 text-base font-bold whitespace-nowrap text-card [--fill:var(--color-ink)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// The + button: choose which place to tour, then pick a time in the Book a tour sheet.
function PickListingSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (l: GroupListing) => void }) {
  const [listings, setListings] = useState<GroupListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || listings) return;
    getMapListings()
      .then((ls) => setListings([...ls].sort((a, b) => b.likes - a.likes || b.match.pct - a.match.pct)))
      .catch((e) => (setError(e.message), setListings([])));
  }, [open, listings]);

  return (
    <Sheet open={open} onClose={onClose} title="Book a tour" subtitle="Which place?">
      <div className="flex flex-col gap-2 pb-1">
        {error && <p className="text-[15px] text-danger">{error}</p>}
        {!listings
          ? [0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-md bg-surface" />)
          : listings.map((l) => (
              <button
                key={l.id}
                onClick={() => onPick(l)}
                className="rough flex items-center gap-2 rounded-md px-3.5 py-3 text-left [--fill:var(--color-surface)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-ink">{l.address}</p>
                  <p className="truncate text-[15px] text-muted">
                    {area(l)} · {money(l.price)}
                  </p>
                </div>
                {l.likes > 0 && (
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-accent-soft px-[9px] py-[3px] text-[15px] font-bold text-accent">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/heart.svg" alt="" width={13} height={13} />
                    {l.likes}
                  </span>
                )}
              </button>
            ))}
      </div>
    </Sheet>
  );
}
