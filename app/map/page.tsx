'use client';
import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { getMapListings, getMySwipes, getStash, type GroupListing } from '@/lib/api';
import PricePill from '@/components/PricePill';
import ListingCard from '@/components/ListingCard';
import Icon from '@/components/Icon';
import MapFiltersSheet, { NO_FILTERS, applyFilters, type Filters } from '@/components/MapFiltersSheet';
import MapSearch from '@/components/MapSearch';

const CENTER = { lat: 40.712, lng: -73.955 };
type LatLng = { lat: number; lng: number };

// Quick chips: each one flips part of the full filter set.
const CHIPS: { label: string; on: (f: Filters) => boolean; toggle: (f: Filters) => Partial<Filters> }[] = [
  { label: 'Liked by flock', on: (f) => f.likedByFlock, toggle: (f) => ({ likedByFlock: !f.likedByFlock }) },
  { label: 'Under $3.5k', on: (f) => f.maxPrice === 3500, toggle: (f) => ({ maxPrice: f.maxPrice === 3500 ? null : 3500 }) },
  { label: '2+ beds', on: (f) => f.minBeds === 2, toggle: (f) => ({ minBeds: f.minBeds === 2 ? 0 : 2 }) },
  { label: 'Pets OK', on: (f) => f.pets, toggle: (f) => ({ pets: !f.pets }) },
];

export default function MapPage() {
  const [all, setAll] = useState<GroupListing[] | null>(null);
  const [swipes, setSwipes] = useState<Map<string, 'left' | 'right'>>(new globalThis.Map());
  const [stashed, setStashed] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMapListings()
      .then(setAll)
      .catch((e) => (setError(e.message), setAll([])));
    getMySwipes().then(setSwipes).catch(() => {});
    getStash().then((ls) => setStashed(new Set(ls.map((l) => l.id)))).catch(() => {});
  }, []);

  const mine = { swipes, stashed };
  const listings = all ? applyFilters(all, filters, mine) : [];
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
              zIndex={l.id === selectedId ? 10 : l.likes > 0 ? 5 : 1}
            >
              <PricePill price={l.price} liked={l.likes > 0} selected={l.id === selectedId} />
            </AdvancedMarker>
          ))}
          {me && (
            <AdvancedMarker position={me} zIndex={0}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/you.svg" alt="You" width={30} height={30} />
            </AdvancedMarker>
          )}
        </Map>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2.5 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex gap-2.5 px-4">
            <MapSearch
              listings={all ?? []}
              activeQuery={filters.query}
              onPickListing={(l) => setSelectedId(l.id)}
              onShowMatches={(query) => setFilters((f) => ({ ...f, query }))}
            />
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Filters"
              className="rough flex size-[46px] items-center justify-center rounded-[14px] text-ink"
            >
              <Icon name="settings" scale={20 / 24} />
            </button>
          </div>
          <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto px-4 pb-2">
            {CHIPS.map((c) => (
              <button
                key={c.label}
                onClick={() => setFilters((f) => ({ ...f, ...c.toggle(f) }))}
                aria-pressed={c.on(filters)}
                className={`rough shrink-0 rounded-full px-3.5 py-2 text-[15px] font-bold whitespace-nowrap ${
                  c.on(filters) ? 'text-card [--fill:var(--color-ink)]' : 'text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {(!all || error) && (
            <div className="rough self-center rounded-full px-3 py-1.5 text-[15px]">
              {error ? <span className="text-danger">{error}</span> : <span className="animate-pulse text-muted">Loading homes…</span>}
            </div>
          )}
          {all && !error && listings.length === 0 && (
            <div className="rough self-center rounded-full px-3 py-1.5 text-[15px] text-muted">
              {filters.query ? `No homes match “${filters.query}”` : 'No homes match these filters'}
            </div>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] flex flex-col items-end gap-3">
          <LocateButton onLocated={setMe} />
          {selected && <ListingCard listing={selected} className="w-full" />}
        </div>

        <MapFiltersSheet
          open={sheetOpen}
          value={filters}
          listings={all ?? []}
          mine={mine}
          onClose={() => setSheetOpen(false)}
          onApply={(f) => {
            setFilters(f);
            setSheetOpen(false);
          }}
        />
      </main>
    </APIProvider>
  );
}

function LocateButton({ onLocated }: { onLocated: (p: LatLng) => void }) {
  const map = useMap();
  function locate() {
    if (!map) return;
    if (!navigator.geolocation) return map.panTo(CENTER);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        onLocated(pos);
        map.panTo(pos);
      },
      () => map.panTo(CENTER),
    );
  }
  return (
    <button onClick={locate} aria-label="Center map on my location">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/locate.svg" alt="" width={46} height={46} />
    </button>
  );
}
