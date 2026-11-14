'use client';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import Link from 'next/link';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { getStash, stash, swipe, undoSwipe, unstash, type GroupListing } from '@/lib/api';
import { money, specs } from '@/lib/format';
import ListingPhoto from './ListingPhoto';
import Icon, { type IconName } from './Icon';

type Direction = 'left' | 'right';
type CardHandle = { fling: (dir: Direction) => void };

const SWIPE_THRESHOLD = 120;
const SHADOW = '[text-shadow:0_1px_6px_rgba(0,0,0,0.35)]';
// Content sits above the bottom nav (64px + safe area).
const ABOVE_NAV = 'bottom-[calc(88px+env(safe-area-inset-bottom))]';

// Full-screen listing swiper (Figma "02 For You" and "07 Map Listing").
// `listings` null = loading. `header` gets how many have been swiped so far.
export default function ListingReel({
  listings,
  loadError,
  header,
  tag,
}: {
  listings: GroupListing[] | null;
  loadError?: string | null;
  header: (swiped: number) => React.ReactNode;
  tag: (l: GroupListing) => string;
}) {
  // Parents pass a key that changes when `listings` loads, so this starts from the fresh list.
  const [deck, setDeck] = useState<GroupListing[] | null>(listings);
  const [history, setHistory] = useState<GroupListing[]>([]);
  const [stashed, setStashed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const card = useRef<CardHandle>(null);

  useEffect(() => {
    getStash()
      .then((ls) => setStashed(new Set(ls.map((l) => l.id))))
      .catch(() => {});
  }, []);

  const [top, next] = deck ?? [];

  function onSwiped(listing: GroupListing, dir: Direction) {
    setDeck((d) => d?.filter((l) => l.id !== listing.id) ?? d);
    setHistory((h) => [...h, listing]);
    swipe(listing.id, dir).catch((e) => {
      setError(e.message);
      setDeck((d) => (d ? [listing, ...d] : d));
      setHistory((h) => h.filter((l) => l.id !== listing.id));
    });
  }

  function undo() {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setDeck((d) => [last, ...(d ?? [])]);
    undoSwipe(last.id).catch((e) => setError(e.message));
  }

  function toggleStash() {
    if (!top) return;
    const id = top.id;
    const on = !stashed.has(id);
    const flip = (v: boolean) =>
      setStashed((prev) => {
        const s = new Set(prev);
        if (v) s.add(id);
        else s.delete(id);
        return s;
      });
    flip(on);
    (on ? stash(id) : unstash(id)).catch(() => flip(!on));
  }

  return (
    <main className="fixed inset-y-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 overflow-hidden bg-ink text-card">
      {!deck ? (
        <div className="absolute inset-0 animate-pulse bg-muted/40" />
      ) : !top ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="text-2xl font-bold">You&apos;re all caught up</p>
          <p className="text-lg opacity-85">No new listings right now. Check back soon.</p>
        </div>
      ) : (
        <>
          {next && <ListingPhoto key={`next-${next.id}`} listing={next} className="absolute inset-0" />}
          <SwipeCard key={top.id} ref={card} listing={top} tag={tag(top)} onSwiped={(dir) => onSwiped(top, dir)} />
        </>
      )}

      <header className={`absolute inset-x-0 top-0 flex h-11 items-center gap-2 px-4 mt-[max(10px,env(safe-area-inset-top))] ${SHADOW}`}>
        {header(history.length)}
        <Link href="/account" aria-label="Settings">
          <Icon name="settings" />
        </Link>
      </header>

      {(error ?? loadError) && (
        <p className={`absolute inset-x-4 top-28 text-center text-base ${SHADOW}`}>{error ?? loadError}</p>
      )}

      <div className={`absolute right-3 flex flex-col items-center gap-6 ${ABOVE_NAV} mb-[34px]`}>
        <Action icon="thumbsUp" label="Yes" onClick={() => card.current?.fling('right')} disabled={!top} />
        <Action icon="thumbsDown" label="Nope" onClick={() => card.current?.fling('left')} disabled={!top} />
        <Action
          icon="saveLg"
          label={top && stashed.has(top.id) ? 'Stashed' : 'Stash'}
          pressed={!!top && stashed.has(top.id)}
          onClick={toggleStash}
          disabled={!top}
        />
        <Action icon="undo" label="Back" onClick={undo} disabled={!history.length} />
      </div>
    </main>
  );
}

function Action({
  icon,
  label,
  onClick,
  disabled,
  pressed,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`flex flex-col items-center gap-1 transition active:scale-90 disabled:opacity-40 ${pressed ? 'text-accent-soft' : ''}`}
    >
      <Icon name={icon} className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]" />
      <span className={`text-[15px] font-bold ${SHADOW}`}>{label}</span>
    </button>
  );
}

function SwipeCard({
  listing,
  tag,
  onSwiped,
  ref,
}: {
  listing: GroupListing;
  tag: string;
  onSwiped: (dir: Direction) => void;
  ref: Ref<CardHandle>;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-8, 8]);
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const [photo, setPhoto] = useState(0);
  const leaving = useRef(false);
  const el = useRef<HTMLDivElement>(null);
  const photoCount = Math.max(1, listing.photos.length);

  function fling(dir: Direction) {
    if (leaving.current) return;
    leaving.current = true;
    animate(x, dir === 'right' ? 600 : -600, { duration: 0.28, ease: 'easeIn' }).then(() => onSwiped(dir));
  }
  useImperativeHandle(ref, () => ({ fling }));

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) fling('right');
    else if (info.offset.x < -SWIPE_THRESHOLD) fling('left');
    else animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
  }

  return (
    <motion.div
      drag="x"
      dragMomentum={false}
      onDragEnd={onDragEnd}
      ref={el}
      onTap={(_, info) => {
        const rect = el.current?.getBoundingClientRect();
        if (!rect || photoCount < 2) return;
        const leftHalf = info.point.x - rect.left < rect.width / 2;
        setPhoto((p) => (leftHalf ? Math.max(0, p - 1) : Math.min(photoCount - 1, p + 1)));
      }}
      style={{ x, rotate }}
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
    >
      <ListingPhoto listing={listing} index={photo} className="size-full">
        <div className="absolute inset-x-0 top-0 h-[170px] bg-gradient-to-b from-[rgba(42,23,8,0.45)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-b from-transparent to-[rgba(42,23,8,0.8)]" />

        <div className="absolute inset-x-4 flex gap-1 top-[calc(max(10px,env(safe-area-inset-top))+50px)]">
          {Array.from({ length: photoCount }, (_, i) => (
            <span key={i} className={`h-[3px] flex-1 rounded-[2px] ${i === photo ? 'bg-card' : 'bg-card/40'}`} />
          ))}
        </div>

        <motion.span
          style={{ opacity: likeOpacity }}
          className="absolute top-40 left-6 -rotate-12 rounded-xl border-[3px] border-accent-soft px-2 text-3xl font-bold text-accent-soft"
        >
          YES
        </motion.span>
        <motion.span
          style={{ opacity: nopeOpacity }}
          className="absolute top-40 right-6 rotate-12 rounded-xl border-[3px] border-card px-2 text-3xl font-bold text-card"
        >
          NOPE
        </motion.span>

        <div className={`absolute left-4 flex w-[min(290px,calc(100%-90px))] flex-col items-start gap-1 text-card ${ABOVE_NAV}`}>
          <span className="rounded-full bg-card/22 px-2.5 py-[3px] text-[15px] font-bold">
            {tag}
          </span>
          <p className="text-4xl font-bold">{money(listing.price)}/mo</p>
          <p className="text-lg">
            {specs(listing)}
            {listing.pets && ' · Pets OK'}
          </p>
          <p className="flex items-center gap-1 text-[17px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/pin.svg" alt="" width={16} height={16} />
            {listing.address} · {listing.neighborhood}
          </p>
        </div>
      </ListingPhoto>
    </motion.div>
  );
}
