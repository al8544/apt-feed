'use client';
import { useEffect, useState } from 'react';
import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { clearMyPin, getMyPin, setMyPin, type Pin } from '@/lib/api';
import Sheet from './Sheet';

const LA = { lat: 34.05, lng: -118.25 };

// Address -> a point, from OpenStreetMap's free search (no key). The address is sent to openstreetmap.org and not stored; only the point is.
// shortcut: fine for a few lookups at a time (their policy is about 1 per second); use Google's Geocoding API (not enabled on our key) for volume.
async function findAddress(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&viewbox=-118.95,34.35,-117.6,33.65&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Address search is unavailable right now. Tap the map instead.');
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

function PanTo({ point }: { point: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => { if (map && point) { map.panTo(point); map.setZoom(14); } }, [map, point]);
  return null;
}

// Drop a commute pin: search an address or tap the map where you travel to most. Your flockmates can see it (migration 0019).
export default function PinSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (pin: Pin | null) => void }) {
  const [pin, setPin] = useState<Pin | null>(null);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null); // where the map should move to
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    getMyPin().then((p) => { setPin(p); setLabel(p?.label ?? ''); setFocus(p); }).catch((e) => setError(e.message));
  }, [open]);

  async function save(next: Pin | null) {
    try {
      if (next) await setMyPin(next); else await clearMyPin();
      onSaved(next);
      onClose();
    } catch (e) { setError((e as Error).message); }
  }

  async function search() {
    const q = address.trim();
    if (!q) return;
    setError(null); setSearching(true);
    try {
      const hit = await findAddress(q);
      if (!hit) return setError('Couldn’t find that address. Try adding the city, or tap the map.');
      setPin({ ...hit, label: null });
      setFocus(hit);
    } catch (e) { setError((e as Error).message); } finally { setSearching(false); }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Commute pin"
      subtitle="Search an address or tap the map. Your flock can see this pin."
      footer={
        <div className="flex gap-3">
          {pin && (
            <button onClick={() => save(null)} className="rough flex-1 rounded-lg py-3.5 text-[21px] font-bold text-ink [--fill:var(--color-surface)]">
              Remove
            </button>
          )}
          <button
            disabled={!pin}
            onClick={() => pin && save({ ...pin, label: label.trim() || null })}
            className="rough flex-1 rounded-lg py-3.5 text-[21px] font-bold text-card [--fill:var(--color-ink)] disabled:opacity-40"
          >
            Save pin
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address, e.g. 1 World Way, Los Angeles"
            className="rough min-w-0 flex-1 rounded-md px-3 py-2.5 text-lg text-ink"
          />
          <button type="submit" disabled={searching || !address.trim()} className="rough rounded-md px-4 text-lg font-bold text-card [--fill:var(--color-ink)] disabled:opacity-40">
            {searching ? '…' : 'Find'}
          </button>
        </form>
        <div className="h-[260px] w-full overflow-hidden rounded-md">
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
            <Map
              mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
              defaultCenter={pin ?? LA}
              defaultZoom={11}
              disableDefaultUI
              onClick={(e) => e.detail.latLng && setPin({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng, label: null })}
            >
              <PanTo point={focus} />
              {pin && <AdvancedMarker position={pin} />}
            </Map>
          </APIProvider>
        </div>
        <p className="text-[15px] text-muted">{pin ? 'Tap the map to move the pin.' : 'No pin yet: search an address above, or tap the map.'}</p>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="Label, e.g. Work (your flock sees it)"
          className="rough w-full rounded-md px-3 py-2.5 text-lg text-ink"
        />
        {error && <p className="text-[15px] text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
