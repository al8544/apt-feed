'use client';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Bookmark, Heart, MapPin, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { getStash, getSwipeDeck, stash, swipe, undoSwipe, unstash, type GroupListing } from '@/lib/api';
import { money, specs } from '@/lib/format';
import ListingPhoto from '@/components/ListingPhoto';

type Direction = 'left' | 'right';
type CardHandle = { fling: (dir: Direction) => void };

const SWIPE_THRESHOLD = 120;

export default function ReelsPage() {
  const [deck, setDeck] = useState<GroupListing[] | null>(null);
  const [tab, setTab] = useState<'forYou' | 'group'>('forYou');
  const [history, setHistory] = useState<GroupListing[]>([]);
  const [stashed, setStashed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const card = useRef<CardHandle>(null);

  useEffect(() => {
    getSwipeDeck()
      .then(setDeck)
      .catch((e) => (setError(e.message), setDeck([])));
    getStash()
      .then((ls) => setStashed(new Set(ls.map((l) => l.id))))
      .catch(() => {});
  }, []);

  const visible = (deck ?? []).filter((l) => tab === 'forYou' || l.likes >= 1);
  const [top, next] = visible;

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
    <main className="flex h-[calc(100dvh-64px-env(safe-area-inset-bottom))] flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center gap-[18px] px-4 mt-[max(8px,env(safe-area-inset-top))]">
        {(
          [
            ['forYou', 'For you'],
            ['group', 'Group picks'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`text-xl ${tab === key ? 'font-bold text-ink' : 'font-semibold text-muted'}`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <SlidersHorizontal size={22} className="text-ink" aria-hidden />
      </header>

      <div className="relative mx-3 mt-2.5 min-h-0 flex-1">
        {!deck ? (
          <div className="size-full animate-pulse rounded-3xl bg-surface" />
        ) : !top ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 rounded-3xl bg-surface px-8 text-center">
            <p className="text-[17px] font-semibold text-ink">You&apos;re all caught up</p>
            <p className="text-[13px] text-muted">
              {tab === 'group' ? 'No group picks left to swipe on. Check "For you".' : 'No new listings right now. Check back soon.'}
            </p>
          </div>
        ) : (
          <>
            {next && (
              <ListingPhoto
                key={`next-${next.id}`}
                listing={next}
                className="absolute inset-x-3 top-3.5 -bottom-3.5 rounded-3xl opacity-50"
              />
            )}
            <SwipeCard key={top.id} ref={card} listing={top} onSwiped={(dir) => onSwiped(top, dir)} />
          </>
        )}
      </div>

      {error && <p className="px-4 pt-2 text-center text-[13px] text-danger">{error}</p>}

      <div className="flex shrink-0 items-center justify-center gap-5 py-6">
        <ActionButton small label="Undo" onClick={undo} disabled={!history.length}>
          <RotateCcw size={18} className="text-muted" />
        </ActionButton>
        <ActionButton label="Pass" onClick={() => card.current?.fling('left')} disabled={!top}>
          <X size={28} className="text-muted" strokeWidth={2} />
        </ActionButton>
        <ActionButton label="Like" accent onClick={() => card.current?.fling('right')} disabled={!top}>
          <Heart size={28} fill="currentColor" strokeWidth={0} className="text-white" />
        </ActionButton>
        <ActionButton small label={top && stashed.has(top.id) ? 'Remove from stash' : 'Stash'} onClick={toggleStash} disabled={!top}>
          <Bookmark size={18} className="text-ink" fill={top && stashed.has(top.id) ? 'currentColor' : 'none'} />
        </ActionButton>
      </div>
    </main>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  small,
  accent,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.14)] transition active:scale-90 disabled:opacity-40 ${
        small ? 'size-11' : 'size-[66px]'
      } ${accent ? 'bg-accent' : 'bg-white'}`}
    >
      {children}
    </button>
  );
}

function SwipeCard({
  listing,
  onSwiped,
  ref,
}: {
  listing: GroupListing;
  onSwiped: (dir: Direction) => void;
  ref: Ref<CardHandle>;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-12, 12]);
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
      className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.18)] active:cursor-grabbing"
    >
      <ListingPhoto listing={listing} index={photo} className="size-full">
        <div className="absolute inset-x-0 bottom-0 h-[54%] bg-gradient-to-b from-transparent to-black/75" />

        <div className="absolute inset-x-3 top-3 flex gap-1">
          {Array.from({ length: photoCount }, (_, i) => (
            <span key={i} className={`h-[3px] flex-1 rounded-full ${i === photo ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>

        <motion.span
          style={{ opacity: likeOpacity }}
          className="absolute top-10 left-5 -rotate-12 rounded-lg border-[3px] border-match px-2 py-0.5 text-2xl font-extrabold text-match"
        >
          LIKE
        </motion.span>
        <motion.span
          style={{ opacity: nopeOpacity }}
          className="absolute top-10 right-5 rotate-12 rounded-lg border-[3px] border-accent px-2 py-0.5 text-2xl font-extrabold text-accent"
        >
          NOPE
        </motion.span>

        <div className="absolute inset-x-4 bottom-[18px] flex flex-col items-start gap-1.5 text-white">
          <span className="rounded-full bg-white/22 px-2.5 py-[5px] text-xs font-semibold backdrop-blur-sm">
            Matches {listing.match.met} of {listing.match.total} group prefs
          </span>
          <p className="text-[28px] leading-tight font-bold">{money(listing.price)}/mo</p>
          <p className="text-[15px] font-medium">
            {specs(listing)}
            {listing.pets && ' · Pets OK'}
          </p>
          <p className="flex items-center gap-1 text-sm">
            <MapPin size={15} />
            {listing.address} · {listing.neighborhood}
          </p>
        </div>
      </ListingPhoto>
    </motion.div>
  );
}
