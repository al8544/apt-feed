'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getGroupFeed,
  getGroupMembers,
  getMySwipes,
  subscribeToGroupSwipes,
  swipe,
  undoSwipe,
  type FeedPost,
  type GroupListing,
} from '@/lib/api';
import { timeAgo } from '@/lib/format';
import PickCard from '@/components/PickCard';
import BookTourSheet from '@/components/BookTourSheet';
import CostarCredit from '@/components/CostarCredit';

type Sort = 'newest' | 'liked' | 'unseen';
type Pick = { listing: GroupListing; lastLikedAt: string };

// One card per listing (the feed has one row per swipe), newest swipe first.
function toPicks(feed: FeedPost[]): Pick[] {
  const seen = new Map<string, Pick>();
  for (const p of feed) if (!seen.has(p.listing.id)) seen.set(p.listing.id, { listing: p.listing, lastLikedAt: p.swipedAt });
  return [...seen.values()];
}

function badge(iso: string) {
  const ago = timeAgo(iso);
  return ago === 'now' || ago.endsWith('m') ? 'New' : `${ago} ago`;
}

export default function FlockPicksPage() {
  const router = useRouter();
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [groupSize, setGroupSize] = useState(0);
  const [mySwipes, setMySwipes] = useState<Map<string, 'left' | 'right'>>(new Map());
  const [sort, setSort] = useState<Sort>('newest');
  const [touring, setTouring] = useState<GroupListing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      getGroupFeed()
        .then((f) => setPicks(toPicks(f)))
        .catch((e) => (setError(e.message), setPicks([])));
    load();
    getGroupMembers().then((m) => setGroupSize(m.length)).catch(() => {});
    getMySwipes().then(setMySwipes).catch(() => {});

    // Live: when anyone in the flock swipes, refresh.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToGroupSwipes(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        load();
        getMySwipes().then(setMySwipes).catch(() => {});
      }, 300);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // Like = your thumbs-up vote, the same as Yes on the reels. Tapping again takes it back.
  function toggleLike(id: string) {
    const was = mySwipes.get(id) === 'right';
    const set = (v: 'right' | null) =>
      setMySwipes((prev) => {
        const m = new Map(prev);
        if (v) m.set(id, v); else m.delete(id);
        return m;
      });
    set(was ? null : 'right');
    (was ? undoSwipe(id) : swipe(id, 'right')).catch(() => set(was ? 'right' : null));
  }

  // A place the flock removed (thumbs-down from half the flock, rounded up) is off the active list.
  const active = (picks ?? []).filter((p) => !p.listing.removed);
  const unseen = active.filter((p) => !mySwipes.has(p.listing.id));
  const shown = sort === 'unseen' ? unseen : sort === 'liked' ? [...active].sort((a, b) => b.listing.likes - a.listing.likes) : active;

  const chips: [Sort, string][] = [
    ['newest', 'Newest'],
    ['liked', 'Most liked'],
    ['unseen', `Not seen yet · ${unseen.length}`],
  ];

  return (
    <main>
      <header className="flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="text-[34px] font-bold text-ink">Flock picks</h1>
          <p className="text-[17px] text-muted">Places your flock liked</p>
        </div>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3.5">
        {chips.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            aria-pressed={sort === key}
            className={`rough shrink-0 rounded-[9px] px-3.5 py-1.5 text-base font-bold whitespace-nowrap ${
              sort === key ? 'text-card [--fill:var(--color-ink)]' : 'text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="px-4 pb-3 text-[15px] text-danger">{error}</p>}

      <div className="flex flex-col gap-3.5 px-4 pb-6">
        {!picks ? (
          [0, 1].map((i) => <div key={i} className="h-[340px] animate-pulse rounded-lg bg-card" />)
        ) : shown.length === 0 ? (
          <div className="rough flex flex-col items-center gap-2 rounded-lg px-8 py-12 text-center">
            <p className="text-xl font-bold text-ink">
              {sort === 'unseen' ? "You've seen them all" : 'No flock picks yet'}
            </p>
            <p className="text-base text-muted">When someone in your flock likes a place, it shows up here.</p>
            <Link href="/reels" className="rough mt-2 rounded-[9px] px-4 py-2 text-lg font-bold text-card [--fill:var(--color-ink)]">
              Start swiping
            </Link>
          </div>
        ) : (
          shown.map(({ listing, lastLikedAt }) => (
            <PickCard
              key={listing.id}
              listing={listing}
              badge={badge(lastLikedAt)}
              groupSize={groupSize}
              liked={mySwipes.get(listing.id) === 'right'}
              onTour={() => setTouring(listing)}
              onLike={() => toggleLike(listing.id)}
            />
          ))
        )}
      </div>

      <BookTourSheet
        listing={touring}
        onClose={() => setTouring(null)}
        onBooked={(id, at) => router.push(`/tours?added=${id}&at=${at.toISOString()}`)}
      />
    <CostarCredit />
    </main>
  );
}
