'use client';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import Link from 'next/link';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { getStash, stash, swipe, undoSwipe, unstash, type GroupListing } from '@/lib/api';
import { money, specs, area } from '@/lib/format';
import ListingPhoto from './ListingPhoto';
import Icon, { type IconName } from './Icon';

type Direction = 'left' | 'right';
type CardHandle = { fling: (dir: Direction) => void };

const SWIPE_THRESHOLD = 120;
// Content sits above the bottom nav (64px + safe area).
const ABOVE_NAV = 'bottom-[calc(88px+env(safe-area-inset-bottom))]';

// Full-screen listing swiper (Figma "02 For You" and "07 Map Listing").
// `listings` null = loading. `header` gets how many have been swiped so far.
export default function ListingReel({
  listings,
  loadError,
  header,
  tag,
  settings = false,
  empty,
}: {
  listings: GroupListing[] | null;
  loadError?: string | null;
  header: (swiped: number) => React.ReactNode;
  tag: (l: GroupListing) => string;
  settings?: boolean; // gear link to Account; For you leaves it off
  empty?: React.ReactNode; // end-of-deck screen; replaces "all caught up" and switches to the light theme
}) {
  // Parents pass a key that changes when `listings` loads, so this starts from the fresh list.
  const [deck, setDeck] = useState<GroupListing[] | null>(listings);
  const [history, setHistory] = useState<GroupListing[]>([]);
  const [stashed, setStashed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Direction | null>(null);
  const card = useRef<CardHandle>(null);

  useEffect(() => {
    getStash()
      .then((ls) => setStashed(new Set(ls.map((l) => l.id))))
      .catch(() => {});
  }, []);

  const [top, next] = deck ?? [];
  const ended = !!empty && !!deck && !top;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function onSwiped(listing: GroupListing, dir: Direction) {
    setDeck((d) => d?.filter((l) => l.id !== listing.id) ?? d);
    setHistory((h) => [...h, listing]);
    if (empty) setToast(dir);
    swipe(listing.id, dir).catch((e) => {
      setError(e.message);
      setDeck((d) => (d ? [listing, ...d] : d));
      setHistory((h) => h.filter((l) => l.id !== listing.id));
    });
  }

  function undo() {
    const last = history.at(-1);
    if (!last) return;
    setToast(null);
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
    <main
      data-light={ended || undefined}
      className={`fixed inset-y-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 overflow-hidden ${ended ? 'bg-card text-ink' : 'bg-ink text-card'}`}
    >
      {!deck ? (
        <div className="absolute inset-0 animate-pulse bg-muted/40" />
      ) : !top ? (
        (empty ?? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-2xl font-bold">You&apos;re all caught up</p>
            <p className="text-lg opacity-85">No new listings right now. Check back soon.</p>
          </div>
        ))
      ) : (
        <>
          {next && <ListingPhoto key={`next-${next.id}`} listing={next} className="absolute inset-0" />}
          <SwipeCard key={top.id} ref={card} listing={top} tag={tag(top)} onSwiped={(dir) => onSwiped(top, dir)} />
        </>
      )}

      <header className="absolute inset-x-0 top-0 flex h-11 items-center gap-2 px-4 mt-[max(10px,env(safe-area-inset-top))]">
        {header(history.length)}
        {settings && (
          <Link href="/account" aria-label="Settings">
            <Icon name="settings" />
          </Link>
        )}
      </header>

      {(error ?? loadError) && <p className="absolute inset-x-4 top-28 text-center text-base">{error ?? loadError}</p>}

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="absolute inset-x-0 top-[calc(max(10px,env(safe-area-inset-top))+64px)] flex justify-center"
          >
            <div className="rough flex items-center gap-4 rounded-lg px-4 py-2 text-base font-bold text-card [--fill:var(--color-ink)]">
              {toast === 'right' ? 'Added to Flock picks' : 'Skipped · won’t show again'}
              <button onClick={undo} className="text-accent-soft underline">
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!ended && (
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
      )}
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
      <Icon name={icon} />
      <span className={`text-[15px] font-bold`}>{label}</span>
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

  // Photos are big hotlinked images. Fetch the neighbors of the one on screen ahead of time, so a tap shows the next
  // photo at once instead of a gradient or the old picture for a moment.
  useEffect(() => {
    for (const i of [photo + 1, photo + 2, photo - 1]) {
      const url = listing.photos[i];
      if (!url) continue;
      const img = new Image();
      img.src = url;
      img.decode().catch(() => {}); // decode now too: a big JPEG decoded on the tap is part of the lag
    }
  }, [photo, listing.photos]);

  function fling(dir: Direction) {
    if (leaving.current) return;
    leaving.current = true;
    if (el.current) el.current.style.pointerEvents = 'none'; // a flying card can't be tapped open
    // One continuous ease-in: it starts slowly enough that the YES / NOPE stamp is visible, then speeds off.
    animate(x, dir === 'right' ? 600 : -600, { duration: 0.45, ease: 'easeIn' }).then(() => onSwiped(dir));
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
        // Not while the card is flying off or springing back. A tap always flips the photo: left half back, right half forward.
        if (!rect || leaving.current || x.isAnimating() || x.get() !== 0) return;
        const left = info.point.x - rect.left < rect.width / 2;
        setPhoto((p) => (left ? Math.max(0, p - 1) : Math.min(photoCount - 1, p + 1)));
      }}
      style={{ x, rotate }}
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
    >
      <ListingPhoto listing={listing} index={photo} className="size-full">
        <div className="absolute inset-x-0 top-0 h-[170px] bg-gradient-to-b from-[rgba(42,23,8,0.45)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-b from-transparent to-[rgba(42,23,8,0.8)]" />

        <div className={`absolute inset-x-4 flex ${photoCount > 20 ? 'gap-px' : 'gap-1'} top-[calc(max(10px,env(safe-area-inset-top))+50px)]`}>
          {Array.from({ length: photoCount }, (_, i) => (
            <span key={i} className={`h-[3px] flex-1 rounded-[2px] ${i === photo ? 'bg-card' : 'bg-card/40'}`} />
          ))}
        </div>

        <motion.span
          style={{ opacity: likeOpacity }}
          className="absolute top-40 left-6 -rotate-12 rounded-[5px] border-[3px] border-accent-soft px-2 text-3xl font-bold text-accent-soft"
        >
          YES
        </motion.span>
        <motion.span
          style={{ opacity: nopeOpacity }}
          className="absolute top-40 right-6 rotate-12 rounded-[5px] border-[3px] border-card px-2 text-3xl font-bold text-card"
        >
          NOPE
        </motion.span>

        <div className={`absolute left-4 flex w-[min(290px,calc(100%-90px))] flex-col items-start gap-1 text-card ${ABOVE_NAV}`}>
          <span className="rounded-md bg-card/22 px-2.5 py-[3px] text-[15px] font-bold">{tag}</span>
          <p className="text-4xl font-bold">{money(listing.price)}/mo</p>
          <p className="text-lg">
            {specs(listing)}
            {listing.pets && ' · Pets OK'}
          </p>
          {photo > 0 && listing.photo_credit_url && (
            // Photos past the first come from Apartments.com; credit and link to the page. Not a tap on the card.
            <a
              href={listing.photo_credit_url}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="text-xs underline opacity-85"
            >
              Photo: Apartments.com
            </a>
          )}
          <p className="flex items-center gap-1 text-[17px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/pin.svg" alt="" width={16} height={16} />
            {listing.address} · {area(listing)}
          </p>
          {/* The only way into the full listing from the deck. Not a tap on the card, so it doesn't flip the photo. */}
          <Link
            href={`/listing/${listing.id}`}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="text-sm font-bold underline opacity-90"
          >
            More info ›
          </Link>
        </div>
      </ListingPhoto>
    </motion.div>
  );
}
