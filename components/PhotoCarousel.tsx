'use client';
import { useRef, useState } from 'react';
import ListingPhoto from './ListingPhoto';
import { money, specs } from '@/lib/format';
import type { FloorPlan, Listing } from '@/lib/api';

// Swipe-through gallery for the listing detail page: native scroll-snap, so drag, trackpad and arrow keys all work.
export default function PhotoCarousel({ listing, plans = [] }: { listing: Pick<Listing, 'id' | 'photos' | 'address'>; plans?: FloorPlan[] }) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  // A mouse can't drag a scroll strip, so the arrows are how desktop gets through it; touch and trackpad swipe natively.
  const go = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth, behavior: 'smooth' });
  const photos = Math.max(1, listing.photos?.length ?? 0);
  const count = photos + (plans.length ? 1 : 0); // the floor plans are the final slide
  return (
    <div className="relative mb-2 w-full">
      <div
        ref={strip}
        className="flex h-[210px] w-full snap-x snap-mandatory overflow-x-auto rounded-md [scrollbar-width:none]"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {Array.from({ length: photos }, (_, i) => (
          <ListingPhoto key={i} listing={listing} index={i} contain className="h-full w-full shrink-0 snap-center" />
        ))}
        {plans.length > 0 && (
          <div className="flex h-full w-full shrink-0 snap-center flex-col gap-1 overflow-y-auto bg-surface p-3">
            <p className="text-base font-bold text-ink">Floor plans</p>
            {plans.map((p) => (
              <div key={p.id} className={`flex justify-between text-base ${p.id === listing.id ? 'font-bold text-ink' : 'text-muted'}`}>
                <span>{specs(p)}</span>
                <span>{money(p.price)}/mo</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {([-1, 1] as const).map((d) => (d < 0 ? index > 0 : index < count - 1) && (
        <button
          key={d}
          onClick={() => go(d)}
          aria-label={d < 0 ? 'Previous photo' : 'Next photo'}
          className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-ink/60 px-2.5 pb-1 text-2xl font-bold leading-none text-card ${d < 0 ? 'left-2' : 'right-2'}`}
        >
          {d < 0 ? '‹' : '›'}
        </button>
      ))}
      {count > 1 && (
        <span className="absolute right-2 top-2 rounded-full bg-ink/60 px-2 py-0.5 text-sm font-bold text-card">
          {index + 1}/{count}
        </span>
      )}
    </div>
  );
}
