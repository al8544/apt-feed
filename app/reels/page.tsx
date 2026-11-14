'use client';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import Link from 'next/link';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { MapPin, Undo2 } from 'lucide-react';
import { getStash, getSwipeDeck, stash, swipe, undoSwipe, unstash, type GroupListing } from '@/lib/api';
import { money, specs } from '@/lib/format';
import ListingPhoto from '@/components/ListingPhoto';
import DrawnIcon, { type DrawnIconName } from '@/components/DrawnIcon';

type Direction = 'left' | 'right';
type CardHandle = { fling: (dir: Direction) => void };

const SWIPE_THRESHOLD = 120;
const SHADOW = 'drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)]';

export default function ForYouPage() {
  const [deck, setDeck] = useState<GroupListing[] | null>(null);
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
    <main className="fixed inset-y-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 overflow-hidden bg-walnut">
      {!deck ? (
        <div className="size-full animate-pulse bg-bark" />
      ) : !top ? (
        <div className="flex size-full flex-col items-center justify-center gap-2 px-8 text-center text-cream">
          <p className="text-[22px] font-bold">You&apos;re all caught up</p>
          <p className="text-[16px] text-cream/75">No new listings right now. Check your flock&apos;s picks.</p>
          <Link href="/" className="rough rough-cream mt-2 rounded-full px-4 py-2 text-[16px] font-bold text-ink">
            See flock picks
          </Link>
        </div>
      ) : (
        <>
          {next && <ListingPhoto key={`next-${next.id}`} listing={next} className="absolute inset-0" />}
          <SwipeCard key={top.id} ref={card} listing={top} onSwiped={(dir) => onSwiped(top, dir)} />
        </>
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center px-4 mt-[max(12px,env(safe-area-inset-top))] text-cream">
        <h1 className={`flex-1 text-[30px] font-bold ${SHADOW}`}>For you</h1>
        <Link href="/account" aria-label="Settings" className={`pointer-events-auto ${SHADOW}`}>
          <DrawnIcon name="settings" size={26} />
        </Link>
      </header>

      {error && (
        <p className="absolute inset-x-4 top-24 rounded-full bg-cream/90 px-3 py-1.5 text-center text-[14px] text-danger">{error}</p>
      )}

      <div className="absolute right-3 bottom-[calc(96px+env(safe-area-inset-bottom))] flex flex-col items-center gap-6">
        <RailButton icon="thumbsup" label="Yes" onClick={() => card.current?.fling('right')} disabled={!top} />
        <RailButton icon="thumbsdown" label="Nope" onClick={() => card.current?.fling('left')} disabled={!top} />
        <RailButton
          icon="save"
          label={top && stashed.has(top.id) ? 'Stashed' : 'Stash'}
          onClick={toggleStash}
          disabled={!top}
          active={!!top && stashed.has(top.id)}
        />
        <button
          onClick={undo}
          disabled={!history.length}
          aria-label="Back"
          className={`flex flex-col items-center gap-1 text-cream transition active:scale-90 disabled:opacity-40 ${SHADOW}`}
        >
          <Undo2 size={28} strokeWidth={1.75} />
          <span className="text-[15px] font-bold">Back</span>
        </button>
      </div>
    </main>
  );
}

function RailButton({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: DrawnIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`flex flex-col items-center gap-1 transition active:scale-90 disabled:opacity-40 ${active ? 'text-match' : 'text-cream'} ${SHADOW}`}
    >
      <DrawnIcon name={icon} size={32} />
      <span className="text-[15px] font-bold">{label}</span>
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
  const rotate = useTransform(x, [-240, 240], [-8, 8]);
  const yesOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
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
        {/* warm fades keep the cream text readable over any photo */}
        <div className="absolute inset-x-0 top-0 h-[170px] bg-gradient-to-b from-[#2a1708]/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-b from-transparent to-[#2a1708]/80" />

        <div className="absolute inset-x-4 top-[calc(104px+env(safe-area-inset-top))] flex gap-1">
          {Array.from({ length: photoCount }, (_, i) => (
            <span key={i} className={`h-[3px] flex-1 rounded-full ${i === photo ? 'bg-cream' : 'bg-cream/40'}`} />
          ))}
        </div>

        <motion.span
          style={{ opacity: yesOpacity }}
          className="absolute top-[calc(130px+env(safe-area-inset-top))] left-5 -rotate-12 rounded-lg border-[3px] border-match px-2 py-0.5 text-[28px] font-bold text-match"
        >
          YES
        </motion.span>
        <motion.span
          style={{ opacity: nopeOpacity }}
          className="absolute top-[calc(130px+env(safe-area-inset-top))] right-5 rotate-12 rounded-lg border-[3px] border-tan px-2 py-0.5 text-[28px] font-bold text-tan"
        >
          NOPE
        </motion.span>

        <div className="absolute bottom-[calc(92px+env(safe-area-inset-bottom))] left-4 flex w-[290px] flex-col items-start gap-1 text-cream">
          <span className="rounded-full bg-cream/22 px-2.5 py-[3px] text-[15px] font-bold backdrop-blur-sm">
            Matches {listing.match.met} of {listing.match.total} flock prefs
          </span>
          <p className="text-[36px] leading-tight font-bold">{money(listing.price)}/mo</p>
          <p className="text-[18px]">
            {specs(listing)}
            {listing.pets && ' · Pets OK'}
          </p>
          <p className="flex items-center gap-1 text-[17px]">
            <MapPin size={16} strokeWidth={1.5} />
            {listing.address} · {listing.neighborhood}
          </p>
        </div>
      </ListingPhoto>
    </motion.div>
  );
}
