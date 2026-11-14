import { Heart } from 'lucide-react';
import { shortPrice } from '@/lib/format';

export default function PricePill({ price, liked, selected }: { price: number; liked: boolean; selected: boolean }) {
  const tone = selected ? 'bg-black text-white' : liked ? 'bg-accent text-white' : 'bg-white text-ink';
  return (
    <div className={`flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)] ${tone}`}>
      {liked && !selected && <Heart size={12} fill="currentColor" strokeWidth={0} />}
      {shortPrice(price)}
    </div>
  );
}
