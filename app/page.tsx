'use client';
import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { supabase } from '@/lib/supabase';

type Listing = {
  id: string; address: string; neighborhood: string;
  price: number; beds: number; baths: number; sqft: number;
  lat: number; lng: number;
};

const GROUP_ID = '00000000-0000-0000-0000-0000000000a1'; // Brooklyn Crew from seed.sql

export default function MapPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id,address,neighborhood,price,beds,baths,sqft,lat,lng');
      if (error) return setError(error.message);
      setListings(data ?? []);

      const { data: likeRows } = await supabase
        .from('group_likes')
        .select('listing_id,likes')
        .eq('group_id', GROUP_ID);
      setLikes(Object.fromEntries((likeRows ?? []).map((r) => [r.listing_id, r.likes])));
    })();
  }, []);

  const pill = (l: Listing) => {
    const liked = (likes[l.id] ?? 0) >= 2;
    const isSelected = selected?.id === l.id;
    return {
      background: isSelected ? '#111' : liked ? '#F43F5E' : '#fff',
      color: isSelected || liked ? '#fff' : '#111',
      padding: '5px 10px', borderRadius: 999, fontWeight: 700, fontSize: 13,
      boxShadow: '0 1px 4px rgba(0,0,0,.25)', cursor: 'pointer', whiteSpace: 'nowrap' as const,
    };
  };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div style={{ height: '100vh', position: 'relative' }}>
        <Map
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
          defaultCenter={{ lat: 40.712, lng: -73.955 }}
          defaultZoom={13}
          disableDefaultUI
          onClick={() => setSelected(null)}
        >
          {listings.map((l) => (
            <AdvancedMarker key={l.id} position={{ lat: l.lat, lng: l.lng }} onClick={() => setSelected(l)}>
              <div style={pill(l)}>
                {(likes[l.id] ?? 0) >= 2 && '♥ '}${(l.price / 1000).toFixed(1)}k
              </div>
            </AdvancedMarker>
          ))}
        </Map>

        {error && (
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, background: '#fee', padding: 12, borderRadius: 12 }}>
            Supabase error: {error}
          </div>
        )}

        {selected && (
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 24, background: '#fff',
                        borderRadius: 20, padding: 16, boxShadow: '0 4px 20px rgba(0,0,0,.15)', maxWidth: 420 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>${selected.price.toLocaleString()}/mo</div>
            <div style={{ color: '#666' }}>{selected.beds} bd · {selected.baths} ba · {selected.sqft} sqft</div>
            <div>{selected.address}, {selected.neighborhood}</div>
            {(likes[selected.id] ?? 0) > 0 && (
              <div style={{ color: '#F43F5E', fontWeight: 600, marginTop: 4 }}>
                ♥ {likes[selected.id]} in your group swiped right
              </div>
            )}
          </div>
        )}
      </div>
    </APIProvider>
  );
}