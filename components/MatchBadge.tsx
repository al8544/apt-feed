import type { Match } from '@/lib/api';

export default function MatchBadge({ match, className = '' }: { match: Match; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1.5 ${className}`}>
      <span className="size-1.5 rounded-full bg-match" />
      <span className="text-xs font-semibold text-white">{match.pct}% group match</span>
    </div>
  );
}
