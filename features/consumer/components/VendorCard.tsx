'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { VendorCard as VendorCardType } from '../types';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export interface VendorCardProps {
  vendor: VendorCardType;
}

// Story 2.5 / 2.6 — food-first vendor card. The hero photo (or fallback
// gradient) is the dominant visual; metadata sits in a tight row beneath.
// Closed vendors stay clickable so the consumer can browse the menu and
// schedule for later (a future feature), but render with reduced opacity.
//
// Photo fallback: most pilot vendors have no profile photo yet (TERRAIN-2
// pending). Instead of a sad gray box, we render a deterministic
// gradient+emoji derived from the vendor's id + badge, so empty-state cards
// still feel intentional and curated.
export function VendorCard({ vendor }: VendorCardProps) {
  return (
    <Link
      href={`/vendors/${vendor.id}`}
      className={cn(
        'group relative block overflow-hidden rounded-3xl bg-chop-card-white shadow-card transition-transform active:scale-[0.99]',
        !vendor.isOpenNow && 'opacity-65',
      )}
    >
      <Hero vendor={vendor} />

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[17px] font-extrabold tracking-tight text-chop-ink">
            {vendor.name}
          </h3>
          <span className="shrink-0 text-[13px] font-bold text-chop-red">
            {formatXAF(vendor.deliveryFeeXAF)}
          </span>
        </div>

        {vendor.badge ? (
          <p className="mt-0.5 truncate text-[12px] font-medium text-chop-ink-secondary">
            {vendor.badge}
          </p>
        ) : null}

        <div className="mt-2.5 flex items-center gap-3 text-[12px] font-semibold text-chop-ink-secondary">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />~{vendor.etaMinutes} min
          </span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-divider" />
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />
            {vendor.distanceKm.toFixed(1)} km
          </span>
        </div>
      </div>
    </Link>
  );
}

function Hero({ vendor }: { vendor: VendorCardType }) {
  const t = useTranslations('VendorCard');
  const placeholder = pickPlaceholder(vendor);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden">
      {vendor.profilePhotoUrl ? (
        // R2-hosted, served via the Next.js `/r2/...` proxy → API
        // MediaController → R2. `next/image` adds WebP/AVIF negotiation +
        // responsive `srcset` + lazy loading. `fill` + `sizes` work
        // because the parent has aspect-[16/9] (fixed ratio container).
        // The `sizes` map matches the grid columns at each breakpoint:
        // 1col <sm → 100vw, 2col sm → 50vw, 3col md/lg → 33vw, 4col xl → 25vw.
        <Image
          src={`/r2/${vendor.profilePhotoUrl}`}
          alt={vendor.name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-[72px]"
          style={{ background: placeholder.gradient }}
          aria-hidden
        >
          <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">{placeholder.emoji}</span>
        </div>
      )}

      {/* bottom-up gradient for caption readability when real photos land */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 via-black/10 to-transparent"
      />

      {/* open / closed stamp — top-left */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-chop-card-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-chop-ink shadow-card backdrop-blur-sm">
        {vendor.isOpenNow ? (
          <>
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-chop-mboue" />
            <span>{t('open')}</span>
          </>
        ) : (
          <>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-chop-neutral" />
            <span>{t('closed')}</span>
          </>
        )}
      </div>

      {/* quartier chip — top-right */}
      {vendor.quartier ? (
        <div className="absolute right-3 top-3 rounded-full bg-chop-ink/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          {vendor.quartier}
        </div>
      ) : null}
    </div>
  );
}

// Deterministic placeholder gradients keyed off a cheap string hash of the
// vendor id. Pairs each gradient with a cuisine emoji derived from badge/
// name keywords. This is purely visual — backend cuisine taxonomy lands in
// Story 2.13.
interface Placeholder {
  gradient: string;
  emoji: string;
}

const GRADIENT_POOL: string[] = [
  // Warm fire
  'linear-gradient(135deg, #E11D2A 0%, #F59E0B 100%)',
  // Charred herb
  'linear-gradient(135deg, #065F46 0%, #84CC16 100%)',
  // Caramel
  'linear-gradient(135deg, #B45309 0%, #FBBF24 100%)',
  // Hibiscus
  'linear-gradient(135deg, #9F1239 0%, #F472B6 100%)',
  // Lagoon
  'linear-gradient(135deg, #0E7490 0%, #67E8F9 100%)',
  // Smoke
  'linear-gradient(135deg, #292524 0%, #A8A29E 100%)',
];

function pickPlaceholder(vendor: VendorCardType): Placeholder {
  const haystack = `${vendor.name} ${vendor.badge ?? ''}`.toLowerCase();
  const emoji = /grill|brochett|viand|poulet|porc|kebab/.test(haystack)
    ? '🍗'
    : /ndol|ndole|koki|eru|achu|okok|local|tradition/.test(haystack)
      ? '🥘'
      : /burger|pizza|sandwich|fast|shawarma/.test(haystack)
        ? '🍔'
        : /salade|sain|bio|vegan/.test(haystack)
          ? '🥗'
          : /boisson|smoothie|jus|cocktail|café|the|the/.test(haystack)
            ? '🥤'
            : /poisson|fish|crevette|mer/.test(haystack)
              ? '🐟'
              : '🍲';

  const gradient = GRADIENT_POOL[hash(vendor.id) % GRADIENT_POOL.length];
  return { gradient, emoji };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
