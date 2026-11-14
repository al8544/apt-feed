import { shortPrice } from '@/lib/format';

// Figma "Map Pin": price pin. Liked = a flock member swiped right.
export default function PricePill({ price, liked, selected }: { price: number; liked: boolean; selected: boolean }) {
  const fill = selected ? '[--fill:var(--color-ink)] text-card' : liked ? '[--fill:var(--color-accent)] text-card' : 'text-ink';
  return (
    <div className={`rough flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-lg font-bold whitespace-nowrap ${fill}`}>
      {liked && !selected && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icons/heart-light.svg" alt="" width={12} height={12} />
      )}
      {shortPrice(price)}
    </div>
  );
}
