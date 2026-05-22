'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface DeliveryMapProps {
  /** Delivery destination */
  lat: number;
  lng: number;
  /** Optional pickup origin — if provided, both pins are drawn. */
  pickupLat?: number;
  pickupLng?: number;
  label?: string;
}

/**
 * Static orientation map for the livreur drop-off page (Story 4.4).
 *
 * Uses Mapbox Static Images API — no JS bundle, no interactive map. The
 * livreur just needs a quick mental picture of where the pin is; the
 * "Ouvrir dans Maps" button is what they actually navigate by.
 *
 * If `NEXT_PUBLIC_MAPBOX_TOKEN` is unset (local dev, missing env), we render
 * the deep-link button alone — the rider still gets navigation, just without
 * the visual preview.
 */
export function DeliveryMap({ lat, lng, pickupLat, pickupLng, label }: DeliveryMapProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const hasPickup = typeof pickupLat === 'number' && typeof pickupLng === 'number';
  const staticUrl = MAPBOX_TOKEN
    ? buildMapboxStatic(MAPBOX_TOKEN, { lat, lng, pickupLat, pickupLng })
    : null;

  return (
    <div className="space-y-2">
      {staticUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ouvrir l'itinéraire vers ${label ?? 'la livraison'} dans Maps`}
          className="block overflow-hidden rounded-lg border border-white/10"
        >
          {/* Mapbox already optimizes the PNG — Next/Image would require host
              allowlisting in next.config and gain nothing for a static URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={staticUrl}
            alt={`Position de livraison ${label ? `— ${label}` : ''}`}
            className="h-44 w-full object-cover"
            loading="lazy"
          />
        </a>
      ) : null}

      <Button asChild variant="outline" className="w-full">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          🗺️ {hasPickup ? "Ouvrir l'itinéraire dans Maps" : 'Ouvrir dans Maps'}
        </a>
      </Button>
    </div>
  );
}

function buildMapboxStatic(
  token: string,
  pts: { lat: number; lng: number; pickupLat?: number; pickupLng?: number },
): string {
  // Tile resolution chosen to fit a 360-400 viewport phone in landscape-letterbox
  // form factor; 2x DPI for sharp Retina rendering. Marker color matches the
  // chop-red brand token.
  const pinColor = 'e8570a';
  const deliveryPin = `pin-l-d+${pinColor}(${pts.lng},${pts.lat})`;
  const pickupPin =
    typeof pts.pickupLat === 'number' && typeof pts.pickupLng === 'number'
      ? `,pin-l-p+0F0F0F(${pts.pickupLng},${pts.pickupLat})`
      : '';
  // Auto-zoom = let Mapbox fit both pins. If only one pin, use a fixed 15z
  // centered on it.
  const viewport = pickupPin ? 'auto' : `${pts.lng},${pts.lat},15`;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `${deliveryPin}${pickupPin}/${viewport}/640x320@2x` +
    `?access_token=${token}`
  );
}
