'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import {
  CURRENT_USER_ID,
  getGroupFeed,
  getGroupMembers,
  getStash,
  stash,
  subscribeToGroupSwipes,
  unstash,
  type FeedPost,
  type GroupListing,
} from '@/lib/api';
import { firstName, money, specs, timeAgo } from '@/lib/format';
import Avatar from '@/components/Avatar';
import ListingPhoto from '@/components/ListingPhoto';
import DrawnIcon from '@/components/DrawnIcon';

type Sort = 'newest' | 'liked' | 'unseen';
type Pick = { listing: GroupListing; lastSwipe: string };

// The feed has one post per swipe; a pick card is one listing, stamped with its latest swipe.
function toPicks(posts: FeedPost[]): Pick[] {
  const byListing = new Map<string, Pick>();
  for (const p of posts) {
    const prev = byListing.get(p.listing.id);
    if (!prev || p.swipedAt > prev.lastSwipe) byListing.set(p.listing.id, { listing: p.listing, lastSwipe: p.swipedAt });
  }
  return [...byListing.values()];
}

export default function FlockPicksPage() {
  const [feed, setFeed] = useState<FeedPost[] | null>(null);
  const [groupSize, setGroupSize] = useState(0);
  const [stashed, setStashed] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>('newest');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGroupFeed()
      .then(setFeed)
      .catch((e) => (setError(e.message), setFeed([])));
    getGroupMembers()
      .then((m) => setGroupSize(m.length))
      .catch(() => {});
    getStash()
      .then((ls) => setStashed(new Set(ls.map((l) => l.id))))
      .catch(() => {});
  }, []);

  // Live: when anyone in the flock swipes, refresh the picks.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToGroupSwipes(() => {
      clearTimeout(timer);
      timer = setTimeout(() => getGroupFeed().then(setFeed).catch(() => {}), 300);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const picks = useMemo(() => {
    const all = feed ? toPicks(feed) : [];
    const unseen = all.filter((p) => !p.listing.likedBy.some((u) => u.id === CURRENT_USER_ID));
    const sorted =
      sort === 'unseen'
        ? unseen
        : sort === 'liked'
          ? [...all].sort((a, b) => b.listing.likes - a.listing.likes)
          : all;
    return { list: sort === 'newest' ? [...sorted].sort((a, b) => b.lastSwipe.localeCompare(a.lastSwipe)) : sorted, unseen: unseen.length };
  }, [feed, sort]);

  function toggleStash(id: string) {
    const on = !stashed.has(id);
    const flip = (v: boolean) =>
      setStashed((prev) => {
        const next = new Set(prev);
        if (v) next.add(id);
        else next.delete(id);
        return next;
      });
    flip(on);
    (on ? stash(id) : unstash(id)).catch(() => flip(!on));
  }

  const chips: [Sort, string][] = [
    ['newest', 'Newest'],
    ['liked', 'Most liked'],
    ['unseen', feed ? `Not seen yet · ${picks.unseen}` : 'Not seen yet'],
  ];

  return (
    <main className="min-h-dvh bg-surface pb-6">
      <header className="flex items-center gap-3 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="text-[32px] leading-tight font-bold text-ink">Flock picks</h1>
          <p className="text-[16px] text-muted">Places your flock swiped right on</p>
        </div>
        <Link href="/account" aria-label="Settings" className="text-ink">
          <DrawnIcon name="settings" size={26} />
        </Link>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3.5">
        {chips.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            aria-pressed={sort === key}
            className={`rough shrink-0 rounded-full px-3.5 py-1.5 text-[15px] font-bold whitespace-nowrap ${
              sort === key ? 'rough-ink text-cream' : 'rough-cream text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="px-4 pb-3 text-[14px] text-danger">{error}</p>}

      <div className="flex flex-col gap-3.5 px-4">
        {!feed ? (
          [0, 1].map((i) => <div key={i} className="h-[340px] animate-pulse rounded-[20px] bg-cream" />)
        ) : picks.list.length === 0 ? (
          <div className="rough rough-cream flex flex-col items-center gap-2 rounded-[20px] px-8 py-14 text-center">
            <p className="text-[18px] font-bold text-ink">
              {sort === 'unseen' ? "You've seen everything" : 'No flock picks yet'}
            </p>
            <p className="text-[15px] text-muted">
              {sort === 'unseen'
                ? 'Every place your flock liked, you already swiped on.'
                : 'When someone in your flock swipes right, it shows up here.'}
            </p>
            <Link href="/reels" className="rough rough-ink mt-2 rounded-full px-4 py-2 text-[15px] font-bold text-cream">
              Start swiping
            </Link>
          </div>
        ) : (
          picks.list.map(({ listing, lastSwipe }) => (
            <PickCard
              key={listing.id}
              listing={listing}
              lastSwipe={lastSwipe}
              groupSize={groupSize}
              stashed={stashed.has(listing.id)}
              onStash={() => toggleStash(listing.id)}
            />
          ))
        )}
      </div>
    </main>
  );
}

function likedText(listing: GroupListing) {
  const names = listing.likedBy.map((u) => (u.id === CURRENT_USER_ID ? 'you' : firstName(u).toLowerCase()));
  if (!names.length) return '';
  if (names.length === 1) return `${names[0]} liked`;
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} & ${names.at(-1)} liked`;
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} liked`;
}

function PickCard({
  listing,
  lastSwipe,
  groupSize,
  stashed,
  onStash,
}: {
  listing: GroupListing;
  lastSwipe: string;
  groupSize: number;
  stashed: boolean;
  onStash: () => void;
}) {
  const age = timeAgo(lastSwipe);
  const fresh = /^(now|\d+m|[0-2]h)$/.test(age); // under 3 hours old
  return (
    <article className="rough rough-cream rounded-[20px]">
      <ListingPhoto listing={listing} rough className="h-[200px] w-full rounded-t-[20px]">
        <span
          className={`rough rough-cream absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[14px] font-bold ${
            fresh ? 'text-accent' : 'text-ink'
          }`}
        >
          {fresh ? 'New' : `${age} ago`}
        </span>
      </ListingPhoto>

      <div className="flex flex-col gap-0.5 px-3.5 pt-3 pb-3.5">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[24px] leading-tight font-bold text-ink">{money(listing.price)}/mo</p>
          <Link href="/tours" aria-label="Plan a tour" className="text-ink">
            <DrawnIcon name="calendar" size={22} />
          </Link>
          <button onClick={onStash} aria-label={stashed ? 'Remove from stash' : 'Stash'} aria-pressed={stashed}>
            <DrawnIcon name="save" size={22} className={stashed ? 'text-accent' : 'text-ink'} />
          </button>
        </div>
        <p className="text-[16px] text-ink">
          {specs(listing)}
          {listing.pets && ' · Pets OK'}
        </p>
        <p className="truncate text-[16px] text-muted">
          {listing.address} · {listing.neighborhood}
        </p>

        <div className="my-2.5 h-px bg-line" />

        <div className="flex items-center gap-2">
          <div className="flex">
            {listing.likedBy.slice(0, 3).map((u) => (
              <Avatar key={u.id} user={u} size={26} className="-mr-[7px] border-2 border-cream last:mr-0" />
            ))}
          </div>
          <p className="min-w-0 flex-1 truncate text-[15px] text-muted">{likedText(listing)}</p>
          {groupSize > 0 && (
            <span className="rough rough-soft flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[15px] font-bold text-accent">
              <Heart size={13} fill="currentColor" strokeWidth={0} />
              {listing.likes}/{groupSize}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
