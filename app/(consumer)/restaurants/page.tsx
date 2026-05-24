import { Suspense } from 'react';
import { CataloguePage } from '@/features/consumer/components/CataloguePage';

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
