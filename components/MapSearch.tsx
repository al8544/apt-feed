'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { GroupListing } from '@/lib/api';
import { shortPrice, area } from '@/lib/format';
import { flockScore } from '@/lib/compare';
import Ducktective from './Ducktective';
import { matchesQuery } from './MapFiltersSheet';

const MAX_HOMES = 4;
const MAX_PLACES = 5;

type Option =
  | { kind: 'home'; listing: GroupListing }
  | { kind: 'all'; count: number }
  | { kind: 'best'; listing: GroupListing }
  | { kind: 'place'; prediction: google.maps.places.PlacePrediction };

// One search bar for both: your listings first, then any place from Google (Places API, New).
export default function MapSearch({
  listings,
  groupSize,
  activeQuery,
  onPickListing,
  onShowMatches,
}: {
  listings: GroupListing[];
  groupSize: number;
  activeQuery: string; // text currently filtering the pins ('' = none)
  onPickListing: (l: GroupListing) => void;
  onShowMatches: (q: string) => void; // '' clears the filter
}) {
  const map = useMap();
  const places = useMapsLibrary('places');
  const [text, setText] = useState(activeQuery);
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [placesError, setPlacesError] = useState(false);
  const [active, setActive] = useState(0);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const q = text.trim();
  const homes = q ? listings.filter((l) => matchesQuery(l, q)) : [];
  // Ducktect Best Option: the best flock score among the matching homes, or among all homes when none match.
  const best = (homes.length ? homes : listings).reduce<GroupListing | null>(
    (b, l) => (!b || flockScore(l, groupSize) > flockScore(b, groupSize) ? l : b),
    null,
  );

  // Google suggestions, debounced. Biased to what's on screen; US only.
  useEffect(() => {
    if (!places || !q) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      token.current ??= new places.AutocompleteSessionToken();
      places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: token.current,
        includedRegionCodes: ['us'],
        locationBias: map?.getBounds() ?? undefined,
      })
        .then(({ suggestions }) => {
          if (cancelled) return;
          setPlacesError(false);
          setPredictions(suggestions.flatMap((s) => (s.placePrediction ? [s.placePrediction] : [])).slice(0, MAX_PLACES));
        })
        // Places API off or over quota: keep searching listings only.
        .catch(() => !cancelled && (setPlacesError(true), setPredictions([])));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [places, map, q]);

  const options: Option[] = [
    ...homes.slice(0, MAX_HOMES).map((listing) => ({ kind: 'home' as const, listing })),
    ...(homes.length > 1 ? [{ kind: 'all' as const, count: homes.length }] : []),
    ...(q ? predictions : []).map((prediction) => ({ kind: 'place' as const, prediction })),
    ...(best ? [{ kind: 'best' as const, listing: best }] : []),
  ];
  const showList = open && !!q;

  function fitTo(ls: GroupListing[]) {
    if (!map || !ls.length) return;
    if (ls.length === 1) {
      map.panTo({ lat: ls[0]!.lat, lng: ls[0]!.lng });
      map.setZoom(15);
      return;
    }
    const b = new google.maps.LatLngBounds();
    ls.forEach((l) => b.extend({ lat: l.lat, lng: l.lng }));
    map.fitBounds(b, 60);
  }

  async function choose(o: Option) {
    setOpen(false);
    if (o.kind === 'home' || o.kind === 'best') {
      setText(o.listing.address);
      onShowMatches('');
      onPickListing(o.listing);
      fitTo([o.listing]);
    } else if (o.kind === 'all') {
      onShowMatches(q);
      fitTo(homes);
    } else {
      setText(o.prediction.mainText?.text ?? o.prediction.text.text);
      onShowMatches('');
      const place = o.prediction.toPlace();
      token.current = null; // a session ends once a place is picked
      try {
        await place.fetchFields({ fields: ['viewport', 'location'] });
        if (place.viewport) map?.fitBounds(place.viewport);
        else if (place.location) {
          map?.panTo(place.location);
          map?.setZoom(15);
        }
      } catch {
        setPlacesError(true);
      }
    }
  }

  function clear() {
    setText('');
    setPredictions([]);
    onShowMatches('');
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div className="rough flex items-center gap-2.5 rounded-md px-3.5 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/search.svg" alt="" width={20} height={20} />
        <input
          role="combobox"
          aria-expanded={showList}
          aria-controls="map-search-list"
          aria-activedescendant={showList && options[active] ? `map-search-${active}` : undefined}
          aria-label="Search homes or places"
          placeholder="Los Angeles, CA"
          value={text}
          onChange={(e) => (setText(e.target.value), setOpen(true), setActive(0))}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return setOpen(false);
            if (!showList || !options.length) return;
            const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
            if (step) {
              e.preventDefault();
              setActive((i) => (i + step + options.length) % options.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              choose(options[active] ?? options[0]!);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[19px] text-ink outline-none placeholder:text-ink"
        />
        {(text || activeQuery) && (
          <button onClick={clear} aria-label="Clear search" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/close.svg" alt="" width={16} height={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showList && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            id="map-search-list"
            role="listbox"
            // Keep focus in the input while tapping an option.
            onMouseDown={(e) => e.preventDefault()}
            className="rough absolute inset-x-0 top-full z-20 mt-2 max-h-[60dvh] overflow-y-auto rounded-md py-1"
          >
            {homes.length === 0 && predictions.length === 0 && (
              <li className="px-3.5 py-2.5 text-base text-muted">{places && !placesError ? 'Searching…' : 'No homes match'}</li>
            )}
            {options.map((o, i) => (
              <Fragment key={o.kind === 'home' ? o.listing.id : o.kind === 'all' || o.kind === 'best' ? o.kind : o.prediction.placeId}>
                {o.kind === 'best' && predictions.length > 0 && (
                  <li className="px-3.5 pt-1 pb-2.5 text-right text-xs text-muted">Places by Google</li>
                )}
                <li
                  id={`map-search-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => choose(o)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-2 px-3.5 py-2 ${
                    i === active ? 'bg-surface' : o.kind === 'best' ? 'bg-card' : ''
                  } ${o.kind === 'best' ? 'sticky bottom-0 rounded-b-md' : ''} ${
                    (o.kind === 'place' || o.kind === 'best') && i > 0 && options[i - 1]!.kind !== o.kind ? 'border-t border-line' : ''
                  }`}
                >
                  {o.kind === 'home' ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icons/heart.svg" alt="" width={13} height={13} className={o.listing.likes ? '' : 'opacity-0'} />
                      <span className="min-w-0 flex-1 truncate text-[17px] text-ink">
                        {o.listing.address} · <span className="text-muted">{area(o.listing)}</span>
                      </span>
                      <span className="shrink-0 text-[15px] font-bold text-accent">{shortPrice(o.listing.price)}</span>
                    </>
                  ) : o.kind === 'all' ? (
                    <span className="text-[17px] font-bold text-accent">Show all {o.count} matching homes</span>
                  ) : o.kind === 'best' ? (
                    <>
                      <Ducktective />
                      <span className="text-xl font-bold text-ink">Ducktect Best Option</span>
                    </>
                  ) : (
                    <>
                      {/* pin.svg is drawn in cream; use it as a mask so it takes the text color */}
                      <span aria-hidden className="size-3.5 shrink-0 bg-muted [mask:url(/icons/pin.svg)_center/contain_no-repeat]" />
                      <span className="min-w-0 flex-1 truncate text-[17px] text-ink">
                        {o.prediction.mainText?.text ?? o.prediction.text.text}{' '}
                        <span className="text-muted">{o.prediction.secondaryText?.text}</span>
                      </span>
                    </>
                  )}
                </li>
              </Fragment>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
