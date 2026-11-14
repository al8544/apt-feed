import { Heart } from 'lucide-react';
import type { GroupListing } from '@/lib/api';
import { money, specs } from '@/lib/format';
import ListingPhoto from './ListingPhoto';

// Floating card for the selected map listing.
export default function ListingCard({ listing, className = '' }: { listing: GroupListing; className?: string }) {
  const [first] = listing.likedBy;
  return (
    <div className={`flex items-center gap-3 rounded-[20px] bg-white p-2.5 shadow-[0_6px_24px_rgba(0,0,0,0.16)] ${className}`}>
      <ListingPhoto listing={listing} className="size-24 shrink-0 rounded-[14px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="text-lg font-bold text-ink">{money(listing.price)}/mo</p>
        <p className="truncate text-[13px] text-muted">{specs(listing)}</p>
        <p className="truncate text-[13px] text-ink">
          {listing.address}, {listing.neighborhood}
        </p>
        {first && (
          <div className="flex items-center gap-1 pt-1 text-xs font-semibold text-accent">
            <Heart size={13} fill="currentColor" strokeWidth={0} />
            <span className="truncate">
              {first.username}
              {listing.likedBy.length > 1 && ` + ${listing.likedBy.length - 1}`} swiped right
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
