import { shortPrice } from '@/lib/format';

// Figma "Map Pin": price pin. Green = someone in the flock liked it; heart = you did.
export default function PricePill({
  price,
  liked,
  mine,
  selected,
  rank,
  dim = false,
}: {
  price: number;
  liked: boolean;
  mine: boolean;
  selected: boolean;
  rank?: number; // a Ducktect pick: its place in the ranking, shown as a number
  dim?: boolean; // Ducktect results are showing and this is not one of them
}) {
  const fill = selected ? '[--fill:var(--color-ink)] text-card' : liked ? '[--fill:var(--color-accent)] text-card' : 'text-ink';
  return (
    <div className={`rough flex cursor-pointer items-center gap-1 rounded-[9px] px-2 py-0.5 text-[15px] font-bold whitespace-nowrap ${fill} ${dim ? 'opacity-40' : ''}`}>
      {rank != null && (
        <span aria-label={`Ducktect pick ${rank}`} className={`flex size-[18px] items-center justify-center rounded-full text-[12px] leading-none ${selected ? 'bg-card text-ink' : 'bg-ink text-card'}`}>
          {rank}
        </span>
      )}
      {mine && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icons/heart-light.svg" alt="" width={12} height={12} />
      )}
      {shortPrice(price)}
    </div>
  );
}
