'use client';
import { useState } from 'react';
import type { Listing } from '@/lib/api';

// Placeholder gradients from the mockups, used while listings have no photos.
const GRADIENTS = [
  'linear-gradient(135deg, rgb(233,201,168) 8%, rgb(156,107,78) 92%)',
  'linear-gradient(135deg, rgb(183,201,214) 8%, rgb(78,106,128) 92%)',
  'linear-gradient(135deg, rgb(214,199,232) 8%, rgb(107,90,142) 92%)',
  'linear-gradient(135deg, rgb(201,220,194) 8%, rgb(88,112,90) 92%)',
  'linear-gradient(125deg, rgb(227,190,150) 8%, rgb(58,70,86) 92%)',
];

export function gradientFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]!;
}

// `rough` gives the photo a hand-made grainy edge: a roughened copy fills the box and a crisp copy sits 4px inside
// it, so only the edge is noisy and the picture itself is untouched. Children (badges) stay crisp.
export default function ListingPhoto({
  listing,
  index = 0,
  className = '',
  rough = false,
  children,
}: {
  listing: Pick<Listing, 'id' | 'photos' | 'address'>;
  index?: number;
  className?: string;
  rough?: boolean;
  children?: React.ReactNode;
}) {
  // A photo that fails to load (hotlink blocked, link rotted) falls back to the gradient instead of a broken image.
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const found = listing.photos?.[index];
  const src = found && !failed.has(found) ? found : undefined;
  const layer = (inset: string, filter?: string) => (
    <div
      className={`absolute ${inset} -z-10 overflow-hidden rounded-[inherit]`}
      style={{ backgroundImage: src ? undefined : gradientFor(listing.id), filter }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={listing.address}
          loading={index ? 'lazy' : undefined}
          draggable={false}
          onError={() => setFailed((f) => new Set(f).add(src))}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
  return (
    <div className={`relative isolate ${rough ? '' : 'overflow-hidden'} ${className}`}>
      {layer('inset-0', rough ? 'url(#rough)' : undefined)}
      {rough && layer('inset-[4px]')}
      {children}
    </div>
  );
}
