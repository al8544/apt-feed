import { Heart } from 'lucide-react';
import type { GroupListing } from '@/lib/api';
import { money, specs } from '@/lib/format';
import ListingPhoto from './ListingPhoto';

// Floating card for the selected map listing.
export default function ListingCard({ listing, className = '' }: { listing: GroupListing; className?: string }) {
  const [first] = listing.likedBy;
  return (
    <div className={`rough rough-cream flex items-center gap-3 rounded-[20px] p-2.5 ${className}`}>
      <ListingPhoto listing={listing} rough className="size-24 shrink-0 rounded-[14px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[20px] leading-tight font-bold text-ink">{money(listing.price)}/mo</p>
        <p className="truncate text-[15px] text-muted">{specs(listing)}</p>
        <p className="truncate text-[15px] text-ink">
          {listing.address}, {listing.neighborhood}
        </p>
        {first && (
          <div className="flex items-center gap-1 pt-0.5 text-[14px] font-bold text-accent">
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
