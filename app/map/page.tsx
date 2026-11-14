'use client';
import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Search, Navigation } from 'lucide-react';
import { getMapListings, type GroupListing, type MapFilters } from '@/lib/api';
import PricePill from '@/components/PricePill';
import ListingCard from '@/components/ListingCard';
import DrawnIcon from '@/components/DrawnIcon';

const CENTER = { lat: 40.712, lng: -73.955 };

const CHIPS: { label: string; filter: MapFilters }[] = [
  { label: 'Liked by flock', filter: { likedByGroup: true } },
  { label: 'Under $3.5k', filter: { maxPrice: 3500 } },
  { label: '2+ beds', filter: { minBeds: 2 } },
  { label: 'Pets OK', filter: { pets: true } },
];

export default function MapPage() {
  const [active, setActive] = useState<Set<number>>(new Set());
  const [listings, setListings] = useState<GroupListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const filters: MapFilters = Object.assign({}, ...[...active].map((i) => CHIPS[i]!.filter));
    let cancelled = false;
    getMapListings(filters)
      .then((ls) => !cancelled && (setListings(ls), setError(null)))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [active]);

  const toggle = (i: number) => {
    setLoading(true);
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selected = listings.find((l) => l.id === selectedId) ?? null;

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <main className="fixed inset-y-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 bg-[#efe9da]">
        <Map
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
          defaultCenter={CENTER}
          defaultZoom={13}
          disableDefaultUI
          gestureHandling="greedy"
          onClick={() => setSelectedId(null)}
          className="size-full"
        >
          {listings.map((l) => (
            <AdvancedMarker
              key={l.id}
              position={{ lat: l.lat, lng: l.lng }}
              onClick={() => setSelectedId(l.id)}
              zIndex={l.id === selectedId ? 10 : l.likes >= 2 ? 5 : 1}
            >
              <PricePill price={l.price} liked={l.likes >= 2} selected={l.id === selectedId} />
            </AdvancedMarker>
          ))}
        </Map>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2.5 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex gap-2.5 px-4">
            <div className="rough rough-cream flex flex-1 items-center gap-2.5 rounded-[14px] px-3.5 py-2.5">
              <Search size={20} strokeWidth={1.5} className="text-muted" />
              <span className="text-[18px] text-ink">Brooklyn, NY</span>
            </div>
            <div className="rough rough-cream flex size-[46px] items-center justify-center rounded-[14px] text-ink">
              <DrawnIcon name="settings" size={22} />
            </div>
          </div>
          <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto px-4 pb-2">
            {CHIPS.map((c, i) => (
              <button
                key={c.label}
                onClick={() => toggle(i)}
                aria-pressed={active.has(i)}
                className={`rough shrink-0 rounded-full px-3.5 py-1.5 text-[15px] font-bold whitespace-nowrap ${
                  active.has(i) ? 'rough-ink text-cream' : 'rough-cream text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {(loading || error) && (
            <div className="rough rough-cream self-center rounded-full px-3 py-1 text-[14px]">
              {error ? <span className="text-danger">{error}</span> : <span className="animate-pulse text-muted">Loading listings…</span>}
            </div>
          )}
          {!loading && !error && listings.length === 0 && (
            <div className="rough rough-cream self-center rounded-full px-3 py-1 text-[14px] text-muted">
              No listings match these filters
            </div>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-[calc(78px+env(safe-area-inset-bottom))] flex flex-col items-end gap-3">
          <LocateButton />
          {selected && <ListingCard listing={selected} className="w-full" />}
        </div>
      </main>
    </APIProvider>
  );
}

function LocateButton() {
  const map = useMap();
  function locate() {
    if (!map) return;
    if (!navigator.geolocation) return map.panTo(CENTER);
    navigator.geolocation.getCurrentPosition(
      (p) => map.panTo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => map.panTo(CENTER),
    );
  }
  return (
    <button
      onClick={locate}
      aria-label="Center map on my location"
      className="rough rough-cream flex size-11 items-center justify-center rounded-full text-accent"
    >
      <Navigation size={18} fill="currentColor" />
    </button>
  );
}
