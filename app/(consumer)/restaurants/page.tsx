import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CataloguePage } from '@/features/consumer/components/CataloguePage';

// Per-route metadata override — distinct title + description so SERPs
// and screen readers can tell this page apart from the marketing splash
// at `/`. Title template `%s | Tchop NoW` is applied automatically.
export const metadata: Metadata = {
  title: 'Restaurants à Douala',
  description:
    'Découvre les restaurants livrés près de chez toi à Douala. Commande en ligne, paie via MoMo, reçois en 30 min.',
  alternates: { canonical: '/restaurants' },
  openGraph: {
    title: 'Restaurants livrés à Douala',
    description:
      'Découvre les restaurants livrés près de chez toi à Douala. Commande en ligne, paie via MoMo, reçois en 30 min.',
    url: '/restaurants',
  },
};

// Story 2.5 — consumer catalogue browse. Public route (auth optional).
// Browser geolocation + 3-plan tiering are handled inside CataloguePage.
//
// Suspense boundary required because CataloguePage uses useSearchParams()
// (URL-persisted filters, #194). Next.js's static prerender pipeline
// cannot resolve search params at build time — wrapping in <Suspense>
// tells the build to render a fallback statically and hydrate the real
// component on the client. The fallback is empty (null) because the page
// renders a skeleton internally as soon as the filter state is read.
export default function RestaurantsPage() {
  return (
    <Suspense fallback={null}>
      <CataloguePage />
    </Suspense>
  );
}
