'use client';
import { useEffect, useState } from 'react';
import { getMySwipes } from '@/lib/api';
import Icon, { type IconName } from './Icon';

type Direction = 'left' | 'right';

// Figma "02b For You · End of Deck": recap of what you swiped, with a way back into each pile.
export default function EndOfDeck({ onReview }: { onReview: (dir: Direction) => void }) {
  const [counts, setCounts] = useState<{ right: number; left: number } | null>(null);
  useEffect(() => {
    getMySwipes()
      .then((m) => {
        const yes = [...m.values()].filter((d) => d === 'right').length;
        setCounts({ right: yes, left: m.size - yes });
      })
      .catch(() => setCounts({ right: 0, left: 0 }));
  }, []);

  const checked = counts ? counts.right + counts.left : 0;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 pb-16">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/avatars/duck-yellow.png" alt="" width={120} height={120} className="rounded-full" />
      <p className="pt-2 text-[32px] font-bold">You&apos;ve seen them all!</p>
      {counts &&
        (checked ? (
          <p className="text-center text-[17px] text-muted">
            {checked} {checked === 1 ? 'home' : 'homes'} checked · {counts.right} yes · {counts.left} nope
            <br />
            Want a second look before your flock votes?
          </p>
        ) : (
          <p className="text-center text-[17px] text-muted">No new listings right now. Check back soon.</p>
        ))}
      {counts && checked > 0 && (
        <div className="flex w-full flex-col gap-3 pt-3">
          <Pile
            icon="thumbsUp"
            title="Review ones I liked"
            note={`${counts.right} ${counts.right === 1 ? 'home' : 'homes'} · change your mind?`}
            count={counts.right}
            onClick={() => onReview('right')}
            dark
          />
          <Pile
            icon="thumbsDown"
            title="Review ones I passed on"
            note={`${counts.left} ${counts.left === 1 ? 'home' : 'homes'} · give them another look`}
            count={counts.left}
            onClick={() => onReview('left')}
          />
        </div>
      )}
    </div>
  );
}

function Pile({
  icon,
  title,
  note,
  count,
  onClick,
  dark,
}: {
  icon: IconName;
  title: string;
  note: string;
  count: number;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!count}
      className={`rough flex items-center gap-3.5 rounded-lg px-4 py-3.5 text-left disabled:opacity-40 ${
        dark ? 'text-card [--fill:var(--color-ink)]' : 'text-ink [--fill:var(--color-surface)]'
      }`}
    >
      <Icon name={icon} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[22px] font-bold">{title}</span>
        <span className={`text-[15px] ${dark ? 'opacity-80' : 'text-muted'}`}>{note}</span>
      </span>
      <span aria-hidden className="text-[28px]">›</span>
    </button>
  );
}
