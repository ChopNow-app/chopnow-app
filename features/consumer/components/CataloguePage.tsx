'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useCatalogue } from '../hooks/useCatalogue';
import { DOUALA_FALLBACK, useGeolocation } from '../hooks/useGeolocation';
import { VendorCard } from './VendorCard';
import { GpsHelpDialog } from './GpsHelpDialog';
import type { VendorCard as VendorCardType } from '../types';

/**
 * Story 2.5 — /restaurants screen.
 *
 * 1. Request browser geolocation on mount.
 * 2. Fall back to Douala center if denied / unsupported.
 * 3. Fetch /api/catalogue + render three plan-tier sections.
 *
 * The catalogue endpoint already filters to ACTIVE + isOpen vendors; we
 * only group + render here.
 */
const PLAN_LABEL: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
  1: { title: 'Près de toi', subtitle: 'Moins de 2 km — livraison la plus rapide' },
  2: { title: 'Un peu plus loin', subtitle: 'Entre 2 et 5 km' },
  3: { title: 'Tout Douala', subtitle: 'Plus de 5 km — frais plus élevés' },
};

export function CataloguePage() {
  const geo = useGeolocation();
  const [showPlan3, setShowPlan3] = React.useState(false);
  const [showGpsHelp, setShowGpsHelp] = React.useState(false);

  React.useEffect(() => {
    if (geo.status === 'idle') geo.request();
  }, [geo]);

  // Coords feed the catalogue fetch. Until we have a fix or a fallback,
  // we keep the hook idle.
  const coords = React.useMemo(() => {
    if (geo.status === 'ready') return { lat: geo.lat, lng: geo.lng };
    if (geo.status === 'denied' || geo.status === 'unsupported') return DOUALA_FALLBACK;
    return null;
  }, [geo]);

  const catalogue = useCatalogue(coords);

  const buckets = React.useMemo(() => {
    if (catalogue.status !== 'ready') {
      return { 1: [] as VendorCardType[], 2: [] as VendorCardType[], 3: [] as VendorCardType[] };
    }
    const out = { 1: [] as VendorCardType[], 2: [] as VendorCardType[], 3: [] as VendorCardType[] };
    for (const v of catalogue.vendors) out[v.plan].push(v);
    return out;
  }, [catalogue]);

  return (
    <main className="min-h-dvh bg-chop-warm pb-16 text-chop-ink">
      <header className="container py-6">
        <h1 className="text-2xl font-bold">Restaurants</h1>
        <p className="text-sm text-muted-foreground">
          {geo.status === 'denied' || geo.status === 'unsupported' ? (
            <>
              Position approximative (centre de Douala).{' '}
              {geo.status === 'denied' ? (
                <button type="button" className="underline" onClick={() => setShowGpsHelp(true)}>
                  Activer la localisation
                </button>
              ) : (
                'Géolocalisation non supportée par ce navigateur.'
              )}
            </>
          ) : (
            'Vendeurs ouverts autour de toi.'
          )}
        </p>
      </header>

      <div className="container space-y-8">
        {catalogue.status === 'loading' || geo.status === 'requesting' ? <SectionSkeleton /> : null}

        {catalogue.status === 'error' ? (
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="text-destructive">{catalogue.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => geo.request()}>
              Réessayer
            </Button>
          </div>
        ) : null}

        {catalogue.status === 'ready' ? (
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

            {showPlan3 ? (
              <Section
                title={PLAN_LABEL[3].title}
                subtitle={PLAN_LABEL[3].subtitle}
                vendors={buckets[3]}
                emptyMessage="Aucun vendeur disponible plus loin."
              />
            ) : buckets[3].length > 0 ? (
              <div className="text-center">
                <Button variant="outline" onClick={() => setShowPlan3(true)}>
                  Voir tous les vendeurs disponibles ({buckets[3].length})
                </Button>
              </div>
            ) : null}

            {buckets[1].length + buckets[2].length === 0 && buckets[3].length === 0 ? (
              <div className="rounded-lg border bg-background p-6 text-center">
                <p className="text-sm">
                  Aucun vendeur ouvert dans ta zone pour le moment.
                  <br />
                  Reviens dans quelques heures !
                </p>
              </div>
            ) : null}
          </>
        ) : null}
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
      <header className="mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      {vendors.length === 0 ? (
        <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-3">
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

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg border bg-background" />
      ))}
    </div>
  );
}
