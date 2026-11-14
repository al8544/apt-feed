import type { GroupListing } from '@/lib/api';
import { money } from '@/lib/format';
import ListingPhoto from './ListingPhoto';

// Figma "Ranking Row". Vote fill = share of the flock that swiped right (track is 64px).
export default function RankingRow({
  rank,
  listing: l,
  score,
  groupSize,
}: {
  rank: React.ReactNode;
  listing: GroupListing;
  score: number;
  groupSize: number;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {typeof rank === 'number' ? <span className="w-[18px] text-center text-[25px] font-bold text-ink">{rank}</span> : rank}
      <ListingPhoto listing={l} className="size-[60px] shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[21px] font-bold text-ink">
          {money(l.price)} · {l.beds} bd
        </p>
        <p className="truncate text-lg text-muted">
          {l.address} · {l.neighborhood}
        </p>
        <div className="flex items-center gap-2 pt-[5px]">
          <div className="h-[5px] w-16 overflow-hidden rounded-[3px] bg-surface">
            <div className="h-full rounded-[3px] bg-accent" style={{ width: `${Math.min(100, groupSize ? (l.likes / groupSize) * 100 : 0)}%` }} />
          </div>
          <span className="truncate text-[17px] text-muted">
            {l.likes}/{groupSize} liked
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-accent">{score}</span>
        <span className="text-[15px] text-muted">score</span>
      </div>
    </div>
  );
}
