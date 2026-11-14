"use client";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

export default function TestMap() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div style={{ height: "100vh" }}>
        <Map
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
          defaultCenter={{ lat: 40.7336, lng: -74.0027 }}
          defaultZoom={14}
          disableDefaultUI
        >
          <AdvancedMarker position={{ lat: 40.7336, lng: -74.0027 }}>
            <div
              style={{
                background: "#111",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              $3.2k
            </div>
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  );
}
