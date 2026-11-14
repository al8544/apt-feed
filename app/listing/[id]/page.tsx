'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGroupMembers, getMapListings, getStash, stash, unstash, type GroupListing } from '@/lib/api';
import { money, specs } from '@/lib/format';
import Avatar from '@/components/Avatar';
import ListingPhoto from '@/components/ListingPhoto';
import NavBar from '@/components/NavBar';
import BookTourSheet from '@/components/BookTourSheet';

// Figma "01c Listing Detail".
export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<GroupListing | null | undefined>(undefined);
  const [size, setSize] = useState(0);
  const [stashed, setStashed] = useState(false);
  const [booking, setBooking] = useState<GroupListing | null>(null);

  useEffect(() => {
    getMapListings().then((ls) => setListing(ls.find((l) => l.id === id) ?? null)).catch(() => setListing(null));
    getGroupMembers().then((m) => setSize(m.length)).catch(() => {});
    getStash().then((ls) => setStashed(ls.some((l) => l.id === id))).catch(() => {});
  }, [id]);

  function toggleStash() {
    const on = !stashed;
    setStashed(on);
    (on ? stash(id) : unstash(id)).catch(() => setStashed(!on));
  }

  return (
    <main className="min-h-dvh bg-card pb-[140px]">
      <NavBar
        title="Listing"
        back={{ href: '/picks', label: 'Back', history: true }}
        right={
          <button onClick={toggleStash} aria-pressed={stashed} className="text-lg font-bold text-accent">
            {stashed ? 'Stashed' : 'Stash'}
          </button>
        }
      />
      {listing === undefined ? (
        <div className="mx-4 mt-2 h-[210px] animate-pulse rounded-md bg-surface" />
      ) : listing === null ? (
        <p className="px-4 pt-6 text-center text-base text-muted">This listing isn&apos;t available.</p>
      ) : (
        <div className="flex flex-col gap-1.5 px-4 pt-1.5">
          <ListingPhoto listing={listing} rough className="mb-2 h-[210px] w-full rounded-md" />
          <p className="text-[32px] font-bold text-ink">{money(listing.price)}/mo</p>
          <p className="text-lg font-bold text-ink">{specs(listing)}{listing.pets && ' · Pets OK'}</p>
          <p className="text-[17px] text-muted">
            {listing.address} · {listing.neighborhood}
          </p>
          <div className="flex items-center gap-2.5 pt-2.5">
            <div className="flex">
              {listing.likedBy.slice(0, 4).map((p) => (
                <Avatar key={p.id} user={p} size={30} className="-mr-2 last:mr-0" />
              ))}
            </div>
            <p className="min-w-0 truncate text-base text-muted">
              {listing.likedBy.length ? `${listing.likedBy.map((p) => p.username).join(', ')} liked` : 'No likes yet'}
            </p>
            <span className="shrink-0 rounded-[7px] bg-accent-soft px-2.5 py-[3px] text-[15px] font-bold text-accent">
              {listing.likes}/{size}
            </span>
          </div>
          {listing.pets && (
            <span className="mt-3 w-fit rounded-[7px] bg-surface px-2.5 py-[3px] text-[15px] font-bold text-ink">Pets OK</span>
          )}
        </div>
      )}
      {listing && (
        <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 w-full max-w-[430px] -translate-x-1/2 bg-linear-to-b from-transparent via-card via-35% to-card px-4 pt-7 pb-3">
          <button
            onClick={() => setBooking(listing)}
            className="rough w-full rounded-lg py-3.5 text-[21px] font-bold text-card [--fill:var(--color-ink)]"
          >
            Book a tour
          </button>
        </div>
      )}
      <BookTourSheet
        listing={booking}
        onClose={() => setBooking(null)}
        onBooked={(tid, at) => router.push(`/tours?added=${tid}&at=${at.toISOString()}`)}
      />
    </main>
  );
}
