import { shortPrice } from '@/lib/format';

// Figma "Map Pin": price pin. Green = someone in the flock liked it; heart = you did.
export default function PricePill({
  price,
  liked,
  mine,
  selected,
}: {
  price: number;
  liked: boolean;
  mine: boolean;
  selected: boolean;
}) {
  const fill = selected ? '[--fill:var(--color-ink)] text-card' : liked ? '[--fill:var(--color-accent)] text-card' : 'text-ink';
  return (
    <div className={`rough flex cursor-pointer items-center gap-1 rounded-[9px] px-2 py-0.5 text-[15px] font-bold whitespace-nowrap ${fill}`}>
      {mine && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icons/heart-light.svg" alt="" width={12} height={12} />
      )}
      {shortPrice(price)}
    </div>
  );
}
