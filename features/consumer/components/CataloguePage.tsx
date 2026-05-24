'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useCatalogue } from '../hooks/useCatalogue';
import { resolveCoords, useGeolocation } from '../hooks/useGeolocation';
import { VendorCard } from './VendorCard';
import { VendorRiderEntryBand } from './VendorRiderEntryBand';
import { VendorCardSkeleton } from './VendorCardSkeleton';
import { GpsHelpDialog } from './GpsHelpDialog';
import { HomeHeader } from './HomeHeader';
import { SearchBar } from './SearchBar';
import { CategoryRail, CATEGORIES, type CategoryId } from './CategoryRail';
import { ConsumerPushPermissionBanner } from './ConsumerPushPermissionBanner';
import { PromoCard } from './PromoCard';
import { SectionHeader } from './SectionHeader';
import type { VendorCard as VendorCardType } from '../types';

/**
 * Story 2.5 — consumer home feed at /restaurants.
 *
 * Editorial composition (Phase 2 redesign — Sugar Art Palier 4 brand):
 *   1. HomeHeader: location pill + oversized greeting + bell
 *   2. SearchBar: client-side filter on name/badge
 *   3. CategoryRail: 6 chips, also a name/badge substring filter
 *   4. PromoCard: time-of-day editorial card
 *   5. SectionHeader + vendor cards: "Près de toi", "Un peu plus loin",
 *      and (collapsed by default) "Tout Douala".
 *
 * Geolocation flow:
 *   - Request once on mount.
 *   - Fall back to Douala center if denied / unsupported (Story 3.15).
 *   - Catalogue refetches when coords change.
 */
const PLAN_LABEL: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
  1: { title: 'Près de toi', subtitle: 'Moins de 2 km · livraison express' },
  2: { title: 'Un peu plus loin', subtitle: 'Entre 2 et 5 km' },
  3: { title: 'Tout Douala', subtitle: 'Plus de 5 km · frais plus élevés' },
};

export function CataloguePage() {
  const geo = useGeolocation();
  const user = useCurrentUser();
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<CategoryId>('all');
  const [showPlan3, setShowPlan3] = React.useState(false);
  const [showGpsHelp, setShowGpsHelp] = React.useState(false);

  // Pull the user's first word from displayName for the home greeting. Splits
  // on whitespace so multi-word display names render as just "Kouamé" in the
  // greeting rather than "Kouamé Nguele Mbappé". Empty / whitespace-only
  // names fall back to null so the greeting renders without a name.
  const firstName =
    user.status === 'authenticated' ? user.user.displayName?.trim().split(/\s+/)[0] || null : null;

  React.useEffect(() => {
    if (geo.status === 'idle') geo.request();
  }, [geo]);

  // `resolveCoords` is the single source of truth for "what coordinates
  // do we query the catalogue with?":
  //   - real GPS coords when they fall inside the Douala service-area bbox
  //   - DOUALA_FALLBACK when the browser denied / can't geolocate / OR
  //     when the geolocated point lands outside the service area (user
  //     is in Paris on a test sandbox, traveling, behind a VPN, etc.)
  //   - null while the prompt is still pending — the query is suspended.
  //
  // Catching the "out-of-zone" case is what fixes the empty-catalogue
  // bug where 3 seeded Bonamoussadi vendors looked invisible to anyone
  // not physically in Douala.
  const resolved = React.useMemo(() => resolveCoords(geo), [geo]);
  const coords = resolved.coords;
  const coordsSource = resolved.source;

  const catalogue = useCatalogue(coords);

  // Pre-bucket by plan, then apply client-side category + query filters on
  // each bucket. Filtering at the bucket level (not before) keeps the empty
  // section copy ("aucun vendeur ouvert dans ton quartier") meaningful.
  const buckets = React.useMemo(() => {
    if (catalogue.status !== 'ready') {
      return { 1: [] as VendorCardType[], 2: [] as VendorCardType[], 3: [] as VendorCardType[] };
    }
    const cat = CATEGORIES.find((c) => c.id === category);
    const q = query.trim().toLowerCase();
    const matches = (v: VendorCardType) => {
      if (q) {
        const hay = `${v.name} ${v.badge ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cat && cat.match.length > 0) {
        const hay = `${v.name} ${v.badge ?? ''}`.toLowerCase();
        if (!cat.match.some((m) => hay.includes(m))) return false;
      }
      return true;
    };
    const out = { 1: [] as VendorCardType[], 2: [] as VendorCardType[], 3: [] as VendorCardType[] };
    for (const v of catalogue.vendors) {
      if (matches(v)) out[v.plan].push(v);
    }
    return out;
  }, [catalogue, query, category]);

  const totalShown = buckets[1].length + buckets[2].length + (showPlan3 ? buckets[3].length : 0);
  const totalAll = buckets[1].length + buckets[2].length + buckets[3].length;

  // Auto-expand the "Tout Douala" bucket when the two closer buckets are
  // empty but vendors exist further out. Avoids the bad first impression of
  // two stacked "Aucun vendeur" cards before the consumer discovers the
  // "Voir tout Douala" button below.
  const autoExpandPlan3 =
    catalogue.status === 'ready' &&
    buckets[1].length === 0 &&
    buckets[2].length === 0 &&
    buckets[3].length > 0;
  const effectiveShowPlan3 = showPlan3 || autoExpandPlan3;

  return (
    <main className="relative min-h-dvh bg-chop-warm text-chop-ink">
      {/* paper grain — 3% noise overlay for editorial feel */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 mx-auto max-w-md pb-8 md:max-w-3xl lg:max-w-6xl xl:max-w-7xl">
        <HomeHeader
          geo={geo}
          coordsSource={coordsSource}
          firstName={firstName}
          onLocationClick={() => {
            if (geo.status === 'denied' || geo.status === 'unsupported') setShowGpsHelp(true);
            else geo.request();
          }}
        />

        <SearchBar value={query} onChange={setQuery} />

        <CategoryRail selected={category} onChange={setCategory} />

        <PromoCard />

        {/* Contextual push opt-in. Self-gated to surface from the 2nd
            page-view onwards, only when permission isn't already decided,
            with a 30-day dismissal TTL. Renders null in the common case. */}
        <div className="mx-5 mt-4 md:mx-8 lg:mx-12">
          <ConsumerPushPermissionBanner />
        </div>

        {/* Loading + error states keep the editorial frame; we don't blow the
            page away to a centered spinner. */}
        {catalogue.status === 'loading' || geo.status === 'requesting' ? (
          <SectionHeaderSkeleton />
        ) : null}

        {catalogue.status === 'error' ? (
          <div className="mx-5 mt-6 rounded-2xl border border-divider bg-chop-card-white p-4 text-sm md:mx-8 lg:mx-12">
            <p className="font-semibold text-chop-danger">{catalogue.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => geo.request()}>
              Réessayer
            </Button>
          </div>
        ) : null}

        {geo.status === 'denied' || geo.status === 'unsupported' ? (
          <div className="mx-5 mt-4 rounded-2xl bg-chop-surface-gray px-4 py-3 text-[12px] font-medium text-chop-ink-secondary md:mx-8 lg:mx-12">
            Position approximative — centre de Douala.{' '}
            {geo.status === 'denied' ? (
              <button
                type="button"
                className="font-semibold text-chop-red underline-offset-2 hover:underline"
                onClick={() => setShowGpsHelp(true)}
              >
                Activer la localisation
              </button>
            ) : (
              <span>Géolocalisation non supportée par ce navigateur.</span>
            )}
          </div>
        ) : null}

        {catalogue.status === 'ready' ? (
          <>
            {autoExpandPlan3 ? (
              // Both near buckets are empty but vendors exist in Tout Douala —
              // collapse the per-bucket empty cards into a single context line
              // so the user doesn't see two stacked "Aucun vendeur" messages
              // before reaching real content. The Section 3 below carries the
              // actual catalogue.
              <p className="mx-5 mt-5 rounded-xl bg-chop-surface-gray px-4 py-3 text-[12px] font-medium text-chop-ink-secondary md:mx-8 lg:mx-auto lg:max-w-3xl lg:px-5">
                Aucun vendeur dans ton quartier ou les zones proches — voici tous les vendeurs
                Douala.
              </p>
            ) : (
              <>
                <Section
                  title={PLAN_LABEL[1].title}
                  subtitle={PLAN_LABEL[1].subtitle}
                  vendors={buckets[1]}
                  emptyMessage="Aucun vendeur ouvert dans ton quartier pour l'instant."
                />
                <Section
                  title={PLAN_LABEL[2].title}
                  subtitle={PLAN_LABEL[2].subtitle}
                  vendors={buckets[2]}
                  emptyMessage="Aucun vendeur dans les quartiers adjacents."
                />
              </>
            )}

            {effectiveShowPlan3 ? (
              <Section
                title={PLAN_LABEL[3].title}
                subtitle={PLAN_LABEL[3].subtitle}
                vendors={buckets[3]}
                emptyMessage="Aucun vendeur disponible plus loin."
              />
            ) : buckets[3].length > 0 ? (
              <div className="px-5 pt-6 md:px-8 lg:px-12">
                <Button variant="outline" className="w-full" onClick={() => setShowPlan3(true)}>
                  Voir tout Douala ({buckets[3].length})
                </Button>
              </div>
            ) : null}

            {totalAll === 0 ? (
              <EmptyAll
                hasQueryOrCategory={query.length > 0 || category !== 'all'}
                onClear={() => {
                  setQuery('');
                  setCategory('all');
                }}
              />
            ) : null}

            {totalShown === 0 && totalAll > 0 && !showPlan3 ? (
              <div className="px-5 pt-3 text-center text-[12px] font-medium text-chop-ink-secondary md:px-8 lg:px-12">
                Aucun résultat à proximité — élargis la recherche.
              </div>
            ) : null}
          </>
        ) : null}

        {/* Discovery for non-consumers — sits at the very bottom of the
            feed so it doesn't compete with the catalogue, but is always
            present so a brand-new PWA user (who bypassed the splash's
            role picker) still finds the vendor / rider onboarding. */}
        <VendorRiderEntryBand />
      </div>

      {showGpsHelp ? <GpsHelpDialog onClose={() => setShowGpsHelp(false)} /> : null}
    </main>
  );
}

function Section({
  title,
  subtitle,
  vendors,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  vendors: VendorCardType[];
  emptyMessage: string;
}) {
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} />
      {vendors.length === 0 ? (
        <p className="mx-5 rounded-2xl bg-chop-surface-gray px-4 py-5 text-center text-[13px] font-medium text-chop-ink-secondary md:mx-8 lg:mx-12">
          {emptyMessage}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 px-5 sm:grid-cols-2 md:grid-cols-3 md:px-8 lg:grid-cols-3 lg:gap-5 lg:px-12 xl:grid-cols-4 xl:gap-6">
          {vendors.map((v) => (
            <li key={v.id}>
              <VendorCard vendor={v} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SectionHeaderSkeleton() {
  // Match the loaded layout: section-header line + the same responsive
  // grid (1 / 2 / 3 / 4 cols) so the transition to data is a content
  // swap, not a layout shift. Six skeletons cover at least one full
  // row on every breakpoint up to xl.
  return (
    <div className="space-y-4 px-5 pt-7 md:px-8 lg:px-12">
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-chop-surface-gray" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4 xl:gap-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} style={{ animationDelay: `${i * 80}ms` }}>
            <VendorCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyAll({
  hasQueryOrCategory,
  onClear,
}: {
  hasQueryOrCategory: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mx-5 mt-6 rounded-3xl bg-chop-card-white p-8 text-center shadow-card md:mx-8 lg:mx-12">
      <div className="text-5xl">🍽️</div>
      <h3 className="mt-3 text-[18px] font-extrabold tracking-tight">
        {hasQueryOrCategory ? 'Rien trouvé' : 'Bientôt en ligne'}
      </h3>
      <p className="mx-auto mt-1 max-w-[260px] text-[13px] font-medium text-chop-ink-secondary">
        {hasQueryOrCategory
          ? 'Essaye un autre mot ou efface les filtres.'
          : 'Aucun vendeur ouvert dans ta zone — reviens dans quelques heures.'}
      </p>
      {hasQueryOrCategory ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
          Effacer les filtres
        </Button>
      ) : null}
    </div>
  );
}
