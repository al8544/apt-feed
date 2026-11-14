'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getMapListings, type GroupListing } from '@/lib/api';
import ListingReel from '@/components/ListingReel';
import Icon from '@/components/Icon';

// Rough distance for sorting only (fine at city scale).
const dist = (a: GroupListing, b: GroupListing) => Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180));

// Figma "07 Map Listing": the tapped listing first, then the nearest ones.
export default function MapListingPage() {
  const { id } = useParams<{ id: string }>();
  const [nearby, setNearby] = useState<GroupListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMapListings()
      .then((ls) => {
        const start = ls.find((l) => l.id === id);
        setNearby(start ? [...ls].sort((a, b) => dist(a, start) - dist(b, start)) : ls);
      })
      .catch((e) => (setError(e.message), setNearby([])));
  }, [id]);

  const total = nearby?.length ?? 0;
  return (
    <ListingReel
      key={nearby ? `loaded-${id}` : 'loading'}
      listings={nearby}
      loadError={error}
      settings
      header={(swiped) => (
        <>
          <Link href="/map" className="flex items-center gap-1.5 text-[22px] font-bold">
            {/* The exported glyph points right; the design flips it. */}
            <Icon name="back" className="-scale-x-100" />
            Map
          </Link>
          <span className="flex-1 text-center text-base opacity-85">
            {total ? `${Math.min(swiped + 1, total)} of ${total} nearby` : ''}
          </span>
        </>
      )}
      tag={(l) => {
        const [first] = l.likedBy;
        if (!first) return `Matches ${l.match.met} of ${l.match.total} flock prefs`;
        return `${first.username}${l.likedBy.length > 1 ? ` + ${l.likedBy.length - 1}` : ''} liked this`;
      }}
    />
  );
}
