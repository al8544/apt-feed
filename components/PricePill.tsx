import { Heart } from 'lucide-react';
import { shortPrice } from '@/lib/format';

export default function PricePill({ price, liked, selected }: { price: number; liked: boolean; selected: boolean }) {
  const tone = selected ? 'rough-ink text-cream' : liked ? 'rough-accent text-cream' : 'rough-cream text-ink';
  return (
    <div className={`rough flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[15px] font-bold whitespace-nowrap ${tone}`}>
      {liked && !selected && <Heart size={12} fill="currentColor" strokeWidth={0} />}
      {shortPrice(price)}
    </div>
  );
}
