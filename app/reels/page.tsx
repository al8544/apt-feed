'use client';
import { useEffect, useState } from 'react';
import { getSwipeDeck, type GroupListing } from '@/lib/api';
import EndOfDeck from '@/components/EndOfDeck';
import ListingReel from '@/components/ListingReel';

export default function ForYouPage() {
  const [deck, setDeck] = useState<GroupListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A fresh object per request, so reviewing the same pile twice still reloads the deck.
  const [review, setReview] = useState<{ dir?: 'right' | 'left' }>({});

  useEffect(() => {
    getSwipeDeck(review.dir ? 100 : 20, review.dir)
      .then(setDeck)
      .catch((e) => (setError(e.message), setDeck([])));
  }, [review]);

  return (
    <ListingReel
      key={`${review.dir}-${deck ? 'loaded' : 'loading'}`}
      listings={deck}
      loadError={error}
      empty={<EndOfDeck onReview={(dir) => (setDeck(null), setReview({ dir }))} />}
      header={() => <h1 className="flex-1 text-[32px] font-bold">For you</h1>}
      tag={(l) => `Matches ${l.match.met} of ${l.match.total} flock prefs`}
    />
  );
}
