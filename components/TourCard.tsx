import { ChevronRight } from 'lucide-react';
import { CURRENT_USER_ID, type Tour } from '@/lib/api';
import { firstName, money } from '@/lib/format';
import Avatar from './Avatar';

function goingLabel(tour: Tour, groupSize?: number) {
  const n = tour.attendees.length;
  if (!n) return 'No one yet';
  if (groupSize && n >= groupSize) return 'Everyone going';
  const names = tour.attendees.map((p) => (p.id === CURRENT_USER_ID ? 'You' : firstName(p)));
  return `${names.slice(0, 2).join(', ')}${n > 2 ? ` +${n - 2}` : ''} going`;
}

export default function TourCard({ tour, groupSize }: { tour: Tour; groupSize?: number }) {
  const d = new Date(tour.startsAt);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="rough rough-surface flex items-center gap-3.5 rounded-[18px] p-3.5">
      <div className="rough rough-cream flex h-[58px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl">
        <span className="text-[13px] font-bold text-accent">
          {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </span>
        <span className="text-[22px] leading-none font-bold text-ink">{d.getDate()}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="truncate text-[15px] font-semibold text-ink">{tour.listing.address}</p>
        <p className="truncate text-[13px] text-muted">
          {time} · {tour.listing.neighborhood} · {money(tour.listing.price)}
        </p>
        <div className="flex items-center gap-1.5 pt-1">
          {tour.attendees.length > 0 && (
            <div className="flex">
              {tour.attendees.slice(0, 3).map((p) => (
                <Avatar key={p.id} user={p} size={22} className="-mr-1.5 border-[1.5px] border-surface last:mr-0" />
              ))}
            </div>
          )}
          <span className="truncate text-xs font-medium text-muted">{goingLabel(tour, groupSize)}</span>
        </div>
      </div>
      <ChevronRight size={20} strokeWidth={1.5} className="shrink-0 text-muted" />
    </div>
  );
}
