'use client';
import { useEffect, useState } from 'react';
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';
import { clearMyPin, getMyPin, setMyPin, type Pin } from '@/lib/api';
import Sheet from './Sheet';

const LA = { lat: 34.05, lng: -118.25 };

// Drop a private commute pin: tap the map where you travel to most. Only distances are ever shared with your flock.
export default function PinSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (pin: Pin | null) => void }) {
  const [pin, setPin] = useState<Pin | null>(null);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getMyPin().then((p) => { setPin(p); setLabel(p?.label ?? ''); }).catch((e) => setError(e.message));
  }, [open]);

  async function save(next: Pin | null) {
    try {
      if (next) await setMyPin(next); else await clearMyPin();
      onSaved(next);
      onClose();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Commute pin"
      subtitle="Tap where you travel to most. Only distances are shared."
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
        <div className="h-[260px] w-full overflow-hidden rounded-md">
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
            <Map
              mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
              defaultCenter={pin ?? LA}
              defaultZoom={11}
              disableDefaultUI
              onClick={(e) => e.detail.latLng && setPin({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng, label: null })}
            >
              {pin && <AdvancedMarker position={pin} />}
            </Map>
          </APIProvider>
        </div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="Label, e.g. Work (only you see it)"
          className="rough w-full rounded-md px-3 py-2.5 text-lg text-ink"
        />
        {error && <p className="text-[15px] text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
