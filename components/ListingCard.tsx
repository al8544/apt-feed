import Link from 'next/link';
import type { GroupListing } from '@/lib/api';
import { money, specs, area } from '@/lib/format';
import ListingPhoto from './ListingPhoto';

// Figma "Selected Listing" on the map. Opens the full-screen listing view.
export default function ListingCard({ listing, className = '' }: { listing: GroupListing; className?: string }) {
  const [first] = listing.likedBy;
  return (
    <Link href={`/map/${listing.id}`} className={`rough flex items-center gap-3 rounded-lg p-2.5 ${className}`}>
      <ListingPhoto listing={listing} className="size-24 shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="text-[21px] font-bold text-ink">{money(listing.price)}/mo</p>
        <p className="truncate text-[15px] text-muted">{specs(listing)}</p>
        <p className="truncate text-[15px] text-ink">
          {listing.address}, {area(listing)}
        </p>
        {first && (
          <div className="flex items-center gap-1 pt-1 text-sm font-bold text-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/heart.svg" alt="" width={13} height={13} />
            <span className="truncate">
              {first.username}
              {listing.likedBy.length > 1 && ` + ${listing.likedBy.length - 1}`} liked
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
