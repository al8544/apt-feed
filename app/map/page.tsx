'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { CURRENT_USER_ID, askDucktect, getFlockPins, getMapListings, getMySwipes, getStash, storedFlockId, type DucktectResult, type DucktectViewport, type FlockPin, type GroupListing } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { cluster, type Cluster } from '@/lib/cluster';
import PricePill from '@/components/PricePill';
import ListingCard from '@/components/ListingCard';
import Icon from '@/components/Icon';
import MapFiltersSheet, { NO_FILTERS, applyFilters, type Filters } from '@/components/MapFiltersSheet';
import MapSearch from '@/components/MapSearch';
import DucktectPanel, { type DucktectState } from '@/components/DucktectPanel';

const CENTER = { lat: 34.0522, lng: -118.2437 }; // downtown Los Angeles
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
  const [zoom, setZoom] = useState(11);
  const [flockPins, setFlockPins] = useState<FlockPin[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMapListings()
      .then(setAll)
      .catch((e) => (setError(e.message), setAll([])));
    getMySwipes().then(setSwipes).catch(() => {});
    getFlockPins().then(setFlockPins).catch(() => {}); // flockmates' commute pins
    getStash().then((ls) => setStashed(new Set(ls.map((l) => l.id)))).catch(() => {});
  }, []);

  // Ducktect best option (docs/DESIGN.md §8.9): the wish goes to /api/ducktect with what the map shows and the filters you set; steps stream in,
  // then one result. While it shows, the pins restyle: picks numbered, the focused one highlighted, everything else dimmed.
  const [ducktect, setDucktect] = useState<DucktectState | null>(null);
  const [focusRank, setFocusRank] = useState(1);
  const abort = useRef<AbortController | null>(null);
  const lastAsk = useRef<{ text: string; viewport: DucktectViewport | null } | null>(null);

  function startDucktect(text: string, viewport: DucktectViewport | null) {
    abort.current?.abort();
    const ac = (abort.current = new AbortController());
    lastAsk.current = { text, viewport };
    setSelectedId(null);
    setFocusRank(1);
    setDucktect({ text, phase: 'running', steps: [], result: null, error: null });
    const patch = (f: (d: DucktectState) => DucktectState) => setDucktect((d) => (d && !ac.signal.aborted ? f(d) : d));
    askDucktect(
      { text, flockId: storedFlockId(), viewport: viewport ?? undefined, filters: { maxRent: filters.maxPrice ?? undefined, beds: filters.minBeds > 0 ? filters.minBeds : undefined, pets: filters.pets || undefined } },
      (e) => {
        if (e.type === 'step') patch((d) => ({ ...d, steps: [...d.steps, e.name] }));
        else if (e.type === 'result') patch((d) => ({ ...d, phase: 'done', result: e.result }));
        else if (e.type === 'error') patch((d) => ({ ...d, phase: 'error', error: e.message }));
      },
      ac.signal,
    )
      .then(() => patch((d) => (d.phase === 'running' ? { ...d, phase: 'error', error: 'Ducktect did not return an answer. Try again.' } : d)))
      .catch((err: Error) => patch((d) => ({ ...d, phase: 'error', error: err.message })));
  }
  function closeDucktect() {
    abort.current?.abort();
    setDucktect(null);
  }

  const mine = { swipes, stashed };
  const listings = all ? applyFilters(all, filters, mine) : [];
  const selected = listings.find((l) => l.id === selectedId) ?? null;

  const result: DucktectResult | null = ducktect?.result ?? null;
  const ranks = new globalThis.Map((result?.picks ?? []).map((p) => [p.communityId ?? p.floorPlanId, p.rank] as const));
  // Zoomed out, nearby places merge into one numbered bubble (like Redfin); the selected place and Ducktect picks always stay on their own.
  const groups = cluster(listings, zoom, (l) => l.id === selectedId || ranks.has(l.community_id ?? l.id));
  // A pick can sit on a place your filters hide from the list; it still gets its pin.
  const extraPicks = (result?.picks ?? []).filter((p) => !listings.some((l) => l.community_id === p.communityId) && p.lat != null && p.lng != null);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <main className="fixed inset-y-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 bg-[#efe9da]">
        <Map
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
          defaultCenter={CENTER}
          defaultZoom={11}
          disableDefaultUI
          gestureHandling="greedy"
          onClick={() => setSelectedId(null)}
          onCameraChanged={(e) => setZoom(Math.round(e.detail.zoom))}
          className="size-full"
        >
          {groups.map((g) => {
            if (g.items.length > 1) return <ClusterMarker key={`c:${g.items[0]!.id}:${g.items.length}`} group={g} />;
            const l = g.items[0]!;
            const rank = ranks.get(l.community_id ?? l.id);
            return (
              <AdvancedMarker
                key={l.id}
                position={{ lat: l.lat, lng: l.lng }}
                onClick={() => (rank ? setFocusRank(rank) : (closeDucktect(), setSelectedId(l.id)))}
                zIndex={rank ? 20 - rank : l.id === selectedId ? 10 : l.likes > 0 ? 5 : 1}
              >
                <PricePill
                  price={l.price}
                  liked={l.likes > 0}
                  mine={l.likedBy.some((p) => p.id === CURRENT_USER_ID)}
                  selected={rank ? rank === focusRank : l.id === selectedId}
                  rank={rank}
                  dim={!!result?.picks.length && !rank}
                />
              </AdvancedMarker>
            );
          })}
          {extraPicks.map((p) => (
            <AdvancedMarker key={p.floorPlanId} position={{ lat: p.lat!, lng: p.lng! }} onClick={() => setFocusRank(p.rank)} zIndex={20 - p.rank}>
              <PricePill price={p.rentFrom} liked={false} mine={false} selected={p.rank === focusRank} rank={p.rank} />
            </AdvancedMarker>
          ))}
          <DucktectMapEffects result={result} />
          {flockPins.map((p) => (
            <AdvancedMarker key={p.user.id} position={{ lat: p.lat, lng: p.lng }} zIndex={2} title={`${p.user.display_name}${p.label ? ` · ${p.label}` : ''}`}>
              <div className="flex flex-col items-center">
                <Avatar user={p.user} size={34} className="border-2 border-card" />
                <span className="mt-0.5 max-w-[110px] truncate rounded bg-card px-1.5 text-xs font-bold text-ink">{p.label ?? p.user.display_name.split(' ')[0]}</span>
              </div>
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
              onPickListing={(l) => (closeDucktect(), setSelectedId(l.id))}
              onShowMatches={(query) => setFilters((f) => ({ ...f, query }))}
              onDucktect={startDucktect}
            />
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Filters"
              className="rough flex size-[46px] items-center justify-center rounded-md text-ink"
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
                className={`rough shrink-0 rounded-[9px] px-3.5 py-2 text-[15px] font-bold whitespace-nowrap ${
                  c.on(filters) ? 'text-card [--fill:var(--color-ink)]' : 'text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {(!all || error) && (
            <div className="rough self-center rounded-[9px] px-3 py-1.5 text-[15px]">
              {error ? <span className="text-danger">{error}</span> : <span className="animate-pulse text-muted">Loading homes…</span>}
            </div>
          )}
          {all && !error && listings.length === 0 && (
            <div className="rough self-center rounded-[9px] px-3 py-1.5 text-[15px] text-muted">
              {filters.query ? `No homes match “${filters.query}”` : 'No homes match these filters'}
            </div>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] flex flex-col items-end gap-3">
          <LocateButton onLocated={setMe} />
          {ducktect && (
            <DucktectPanel
              state={ducktect}
              listings={all ?? []}
              hasFlock={!!storedFlockId()}
              swipes={swipes}
              onVote={(id, dir) =>
                setSwipes((m) => {
                  const next = new globalThis.Map(m);
                  if (dir) next.set(id, dir);
                  else next.delete(id);
                  return next;
                })
              }
              focusRank={focusRank}
              onFocus={setFocusRank}
              onClose={closeDucktect}
              onRetry={() => lastAsk.current && startDucktect(lastAsk.current.text, lastAsk.current.viewport)}
              onRefine={() => {
                closeDucktect();
                document.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus(); // the search bar keeps your wish; edit it and ask again
              }}
            />
          )}
          <AnimatePresence mode="wait">
            {selected && !ducktect && (
              <motion.div
                key={selected.id}
                className="w-full"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.18 }}
              >
                <ListingCard listing={selected} className="w-full" />
              </motion.div>
            )}
          </AnimatePresence>
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

// When Ducktect answers: move the map to its picks (or to the area it searched), leaving room for the panel at the bottom.
function DucktectMapEffects({ result }: { result: DucktectResult | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !result) return;
    const b = new google.maps.LatLngBounds();
    result.picks.forEach((p) => p.lat != null && p.lng != null && b.extend({ lat: p.lat, lng: p.lng }));
    if (b.isEmpty() && result.area) {
      const v = result.area.viewport;
      b.extend({ lat: v.south, lng: v.west });
      b.extend({ lat: v.north, lng: v.east });
    }
    if (!b.isEmpty()) map.fitBounds(b, { top: 150, bottom: Math.round(window.innerHeight * 0.6), left: 40, right: 40 });
  }, [map, result]);
  return null;
}

// A bubble with the number of places in the area; green when someone in the flock liked one of them. Tap to zoom in.
function ClusterMarker({ group }: { group: Cluster<GroupListing> }) {
  const map = useMap();
  const n = group.items.length;
  const liked = group.items.some((l) => l.likes > 0);
  const size = Math.min(56, 30 + String(n).length * 8 + Math.log2(n) * 2);
  return (
    <AdvancedMarker position={group} zIndex={3} onClick={() => map && (map.panTo(group), map.setZoom(Math.min((map.getZoom() ?? 11) + 2, 17)))}>
      <div
        aria-label={`${n} places here`}
        style={{ width: size, height: size }}
        className={`flex cursor-pointer items-center justify-center rounded-full border-2 border-card text-[15px] font-bold ${liked ? 'bg-accent text-card' : 'bg-ink text-card'}`}
      >
        {n}
      </div>
    </AdvancedMarker>
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
