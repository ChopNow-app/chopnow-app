'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet ships its marker icons via relative URLs from leaflet.css. Bundlers
// don't resolve those, so the markers go missing. We rebind the default icon
// to inline PNGs from the leaflet CDN — works without ejecting + no bundler
// config gymnastics. (Standard react-leaflet workaround.)
const DEFAULT_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DEFAULT_ICON;

interface VendorLocationMapProps {
  /** Currently selected position — drives the marker. */
  lat: number;
  lng: number;
  /** Fires whenever the vendor drags the pin OR taps a new spot on the map. */
  onChange: (next: { latitude: number; longitude: number }) => void;
}

// Map view recenters whenever the parent passes new lat/lng (e.g. after GPS
// re-capture). Without this, the map stays on its initial center even if
// `lat`/`lng` props change.
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView([lat, lng], map.getZoom() ?? 16, { animate: true });
  }, [map, lat, lng]);
  return null;
}

// Tap-to-place: any click on the open map moves the marker to that point.
// Complements the drag-pin interaction below — useful when the GPS-captured
// point is way off and the vendor wants to retag from scratch.
function TapToPlace({ onChange }: { onChange: VendorLocationMapProps['onChange'] }) {
  useMapEvents({
    click(e) {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

/**
 * Draggable Leaflet map for vendor onboarding (#1). The vendor captures
 * their position with the browser geolocation API, then either accepts the
 * pin where it landed OR drags it to refine — useful when GPS lands them
 * across the street or in the wrong building.
 *
 * OpenStreetMap tiles (no token, no quota). If the pilot scales past
 * OSM's tile-usage policy (~1k req/min/IP) we swap to Mapbox raster tiles
 * with NEXT_PUBLIC_MAPBOX_TOKEN; the API of this component doesn't change.
 *
 * MUST be dynamically imported with { ssr: false } from the parent — Leaflet
 * touches `window` on mount and Next.js will fail SSR otherwise.
 */
export default function VendorLocationMap({ lat, lng, onChange }: VendorLocationMapProps) {
  const markerRef = React.useRef<L.Marker | null>(null);

  return (
    <div
      className="overflow-hidden rounded-2xl border-2 border-chop-mboue/40 shadow-card"
      style={{ height: 280 }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        aria-label="Carte de la position du vendeur"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Marker
          position={[lat, lng]}
          draggable
          ref={(m) => {
            markerRef.current = m;
          }}
          eventHandlers={{
            dragend: () => {
              const m = markerRef.current;
              if (!m) return;
              const pos = m.getLatLng();
              onChange({ latitude: pos.lat, longitude: pos.lng });
            },
          }}
        />
        <MapRecenter lat={lat} lng={lng} />
        <TapToPlace onChange={onChange} />
      </MapContainer>
    </div>
  );
}
