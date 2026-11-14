'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStash, type Listing } from '@/lib/api';
import { GROUP_NAME, money } from '@/lib/format';
import ListingPhoto from '@/components/ListingPhoto';
import NavBar from '@/components/NavBar';

// Figma "06b My Stash".
export default function StashPage() {
  const [stash, setStash] = useState<Listing[] | null>(null);
  useEffect(() => {
    getStash().then(setStash).catch(() => setStash([]));
  }, []);

  return (
    <main className="min-h-dvh bg-card pb-6">
      <NavBar title="My stash" back={{ href: '/account', label: 'Account' }} />
      <p className="px-4 pb-3 text-[15px] text-muted">
        Only you can see this{stash && ` · ${stash.length} saved`}
      </p>
      {!stash ? (
        <div className="grid grid-cols-2 gap-3 px-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[130px] animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      ) : stash.length === 0 ? (
        <p className="rough mx-4 rounded-md p-4 text-center text-base text-muted">
          Nothing stashed yet. Tap the bookmark on any listing to save it here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-4">
          {stash.map((l) => (
            <Link key={l.id} href={`/listing/${l.id}`} className="flex flex-col gap-1">
              <ListingPhoto listing={l} rough className="mb-1 h-[110px] w-full rounded-md" />
              <p className="text-xl font-bold text-ink">{money(l.price)}/mo</p>
              <p className="truncate text-[15px] text-muted">{l.address}</p>
              <span className="w-fit rounded-[5px] bg-accent-soft px-2 py-0.5 text-[13px] font-bold text-accent">{GROUP_NAME}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
