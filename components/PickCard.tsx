import { CURRENT_USER_ID, type GroupListing } from '@/lib/api';
import { money, specs } from '@/lib/format';
import Avatar from './Avatar';
import Icon from './Icon';
import ListingPhoto from './ListingPhoto';

// Figma "Pick Card": a listing someone in your flock swiped right on.
// Faces = who liked it; pill = share of flock that swiped right. Calendar = plan a tour, bookmark = stash.
export default function PickCard({
  listing,
  badge,
  groupSize,
  stashed,
  onTour,
  onStash,
}: {
  listing: GroupListing;
  badge?: string;
  groupSize: number;
  stashed: boolean;
  onTour: () => void;
  onStash: () => void;
}) {
  return (
    <article className="rough flex w-full flex-col rounded-[20px]">
      <ListingPhoto listing={listing} className="h-[200px] w-full rounded-t-[20px]">
        {badge && (
          <span className="rough absolute top-3 left-3 rounded-full px-2.5 py-1 text-sm font-bold text-accent">{badge}</span>
        )}
      </ListingPhoto>
      <div className="flex flex-col gap-0.5 px-3.5 pt-3 pb-3.5">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-2xl font-bold text-ink">{money(listing.price)}/mo</p>
          <button onClick={onTour} aria-label="Book a tour" className="text-ink">
            <Icon name="calendar" />
          </button>
          <button
            onClick={onStash}
            aria-label={stashed ? 'Remove from stash' : 'Stash'}
            aria-pressed={stashed}
            className={stashed ? 'text-accent' : 'text-ink'}
          >
            <Icon name="save" />
          </button>
        </div>
        <p className="text-base text-ink">{specs(listing)}</p>
        <p className="truncate text-base text-muted">
          {listing.address} · {listing.neighborhood}
        </p>
        <div className="py-2.5">
          <div className="h-px bg-line" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex shrink-0">
            {listing.likedBy.slice(0, 4).map((p) => (
              <Avatar key={p.id} user={p} size={26} className="-mr-[7px] border-2 border-card last:mr-0" />
            ))}
          </div>
          <p className="min-w-0 flex-1 truncate text-[15px] text-muted">{likedByText(listing)}</p>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-[9px] py-[3px] text-[15px] font-bold text-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/heart.svg" alt="" width={13} height={13} />
            {listing.likes}/{groupSize}
          </span>
        </div>
      </div>
    </article>
  );
}

// "maya, jordan & sam liked" / "jordan & you liked"
function likedByText(l: GroupListing) {
  const names = [
    ...l.likedBy.filter((p) => p.id !== CURRENT_USER_ID).map((p) => p.username),
    ...(l.likedBy.some((p) => p.id === CURRENT_USER_ID) ? ['you'] : []),
  ];
  if (!names.length) return '';
  const last = names.pop();
  return `${names.length ? `${names.join(', ')} & ` : ''}${last} liked`;
}
