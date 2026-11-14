'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CURRENT_USER_ID, cancelTour, getTour, joinTour, leaveTour, type Tour } from '@/lib/api';
import { firstName, money } from '@/lib/format';
import Avatar from '@/components/Avatar';
import ListingPhoto from '@/components/ListingPhoto';
import NavBar from '@/components/NavBar';
import BookTourSheet from '@/components/BookTourSheet';
import Sheet from '@/components/Sheet';
import Toggle from '@/components/Toggle';

// Figma "04b Tour Detail".
export default function TourDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null | undefined>(undefined);
  const [moving, setMoving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTour(id).then(setTour).catch(() => setTour(null));
  }, [id]);

  const going = !!tour?.attendees.some((p) => p.id === CURRENT_USER_ID);
  // RSVP, then refetch so the faces and names follow.
  async function rsvp(on: boolean) {
    setError(null);
    try {
      await (on ? joinTour(id) : leaveTour(id));
      setTour(await getTour(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const d = tour && new Date(tour.startsAt);
  return (
    <main className="min-h-dvh bg-card pb-6">
      <NavBar title="Tour" back={{ href: '/tours', label: 'Tours' }} />
      {tour === undefined ? (
        <div className="mx-4 mt-2 h-[210px] animate-pulse rounded-md bg-surface" />
      ) : tour === null || !d ? (
        <p className="px-4 pt-6 text-center text-base text-muted">This tour isn&apos;t available.</p>
      ) : (
        <div className="flex flex-col gap-1 px-4 pt-1.5">
          <ListingPhoto listing={tour.listing} rough className="mb-3 h-[210px] w-full rounded-md" />
          <h2 className="text-[26px] font-bold text-ink">{tour.listing.address}</h2>
          <p className="text-base text-muted">
            {tour.listing.neighborhood} · {money(tour.listing.price)}/mo · {tour.listing.beds} bd
          </p>
          <h3 className="pt-3 text-[22px] font-bold text-ink">
            {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </h3>
          <p className="text-base text-muted">{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
          <h3 className="pt-3 text-lg font-bold text-ink">Going</h3>
          <div className="flex items-center gap-2.5">
            <div className="flex">
              {tour.attendees.slice(0, 4).map((p) => (
                <Avatar key={p.id} user={p} size={30} className="-mr-2 last:mr-0" />
              ))}
            </div>
            <p className="text-base text-muted">
              {tour.attendees.map((p) => (p.id === CURRENT_USER_ID ? 'You' : firstName(p))).join(', ') || 'No one yet'}
            </p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[17px] text-muted">I&apos;m going</span>
            <Toggle on={going} onChange={rsvp} label="I'm going" />
          </div>
          <h3 className="pt-3 text-lg font-bold text-ink">Meet at</h3>
          <p className="text-base text-muted">{tour.listing.address}, front door</p>
          {error && <p className="pt-3 text-[15px] text-danger">{error}</p>}
          <button
            onClick={() => setMoving(true)}
            className="rough mt-5 rounded-lg py-3.5 text-xl font-bold text-ink [--fill:var(--color-surface)]"
          >
            Reschedule
          </button>
          <button onClick={() => setConfirming(true)} className="w-fit pt-3 text-base text-danger underline">
            Cancel tour
          </button>
        </div>
      )}
      <BookTourSheet
        listing={moving && tour ? tour.listing : null}
        rescheduleId={tour?.id}
        onClose={() => setMoving(false)}
        onBooked={(tid) => {
          setMoving(false);
          getTour(tid).then(setTour).catch(() => {});
        }}
      />
      <Sheet open={confirming} onClose={() => setConfirming(false)} title="Cancel this tour?" subtitle="Your flock will see it removed.">
        <div className="flex flex-col gap-2 pb-1">
          <button
            onClick={() =>
              cancelTour(id)
                .then(() => router.replace('/tours'))
                .catch((e) => (setError(e.message), setConfirming(false)))
            }
            className="rough rounded-lg py-3.5 text-xl font-bold text-card [--fill:var(--color-danger)]"
          >
            Cancel tour
          </button>
          <button onClick={() => setConfirming(false)} className="rough rounded-lg py-3.5 text-xl font-bold text-ink [--fill:var(--color-surface)]">
            Keep tour
          </button>
        </div>
      </Sheet>
    </main>
  );
}
