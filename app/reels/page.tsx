'use client';
import { useEffect, useState } from 'react';
import { getSwipeDeck, type GroupListing } from '@/lib/api';
import ListingReel from '@/components/ListingReel';

export default function ForYouPage() {
  const [deck, setDeck] = useState<GroupListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSwipeDeck()
      .then(setDeck)
      .catch((e) => (setError(e.message), setDeck([])));
  }, []);

  return (
    <ListingReel
      key={deck ? 'loaded' : 'loading'}
      listings={deck}
      loadError={error}
      header={() => <h1 className="flex-1 text-[32px] font-bold">For you</h1>}
      tag={(l) => `Matches ${l.match.met} of ${l.match.total} flock prefs`}
    />
  );
}
