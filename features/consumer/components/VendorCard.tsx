'use client';

import * as React from 'react';
import Link from 'next/link';
import type { VendorCard as VendorCardType } from '../types';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export interface VendorCardProps {
  vendor: VendorCardType;
}

/**
 * Story 2.5 / 2.6 — vendor card on the /restaurants list. Renders the
 * three server-computed values (distance, fee, ETA) without doing any
 * geo math client-side. Closed vendors get the grey treatment but stay
 * clickable so the consumer can still browse their menu.
 */
export function VendorCard({ vendor }: VendorCardProps) {
  return (
    <Link
      href={`/vendors/${vendor.id}`}
      className={`block rounded-2xl bg-chop-card-white shadow-card transition-transform active:scale-[0.99] ${
        vendor.isOpenNow ? '' : 'opacity-60'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {vendor.profilePhotoUrl ? (
          // Photos live in Cloudflare R2; for MVP we render the raw key as
          // a relative path. The R2 public URL prefix lands when CDN
          // hosting wires up (Story 2.11 hardening).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/r2/${vendor.profilePhotoUrl}`}
            alt={vendor.name}
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-chop-orange-light text-3xl">
            🍲
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-bold">{vendor.name}</h3>
            {!vendor.isOpenNow ? (
              <span className="shrink-0 rounded-full bg-chop-surface-gray px-2 py-0.5 text-[11px] font-semibold">
                Fermé
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-chop-mboue-light px-2 py-0.5 text-[11px] font-semibold text-chop-mboue">
                Ouvert
              </span>
            )}
          </div>

          {vendor.badge ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{vendor.badge}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>📍</span>
              {vendor.distanceKm.toFixed(1)} km
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>⏱</span>~{vendor.etaMinutes} min
            </span>
            <span aria-hidden>·</span>
            <span className="font-semibold text-chop-ink">{formatXAF(vendor.deliveryFeeXAF)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
