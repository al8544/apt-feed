'use client';
import { useEffect } from 'react';
import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import type { FlockPin } from '@/lib/api';
import Avatar from './Avatar';

const LA = { lat: 34.05, lng: -118.25 };

function Fit({ pins }: { pins: FlockPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !pins.length) return;
    if (pins.length === 1) return map.setCenter(pins[0]!), map.setZoom(12);
    const b = new google.maps.LatLngBounds();
    pins.forEach((p) => b.extend(p));
    map.fitBounds(b, 40);
  }, [map, pins]);
  return null;
}

// A small map of where everyone in the flock travels to most (their commute pins), for the Flock tab.
export default function FlockPinsMap({ pins }: { pins: FlockPin[] }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="rough mx-4 h-[190px] overflow-hidden rounded-[9px]">
        <Map mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID} defaultCenter={LA} defaultZoom={10} disableDefaultUI gestureHandling="cooperative" className="size-full">
          <Fit pins={pins} />
          {pins.map((p) => (
            <AdvancedMarker key={p.user.id} position={p} title={`${p.user.display_name}${p.label ? ` · ${p.label}` : ''}`}>
              <div className="flex flex-col items-center">
                <Avatar user={p.user} size={30} className="border-2 border-card" />
                <span className="mt-0.5 max-w-[100px] truncate rounded bg-card px-1.5 text-xs font-bold text-ink">{p.label ?? p.user.display_name.split(' ')[0]}</span>
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </div>
    </APIProvider>
  );
}
