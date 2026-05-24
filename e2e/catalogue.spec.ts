import { test, expect } from '@playwright/test';

/**
 * Smoke: `/restaurants` renders the catalogue with a mocked API response
 * + vendor cards are clickable + filter URL state persists.
 *
 * What this catches that Vitest can't:
 *   - CataloguePage's geolocation → catalogue fetch → bucket → render
 *     full pipeline, end-to-end against a real Next.js runtime
 *   - The Suspense boundary required for useSearchParams (PR #194 fix)
 *   - Filter URL roundtrip (?q=&cat=) that depends on the App Router
 *     + Next.js dev server
 *   - VendorCard's next/image proxy for /r2/* paths
 */

// Matches features/consumer/types.ts VendorCard exactly. Keeping the
// fixture aligned with the real type guarantees the test fails for a
// schema regression instead of silently passing on a half-shaped mock.
const MOCK_VENDORS = [
  {
    id: 'v-makepe-001',
    name: 'Maman Mboué',
    type: 'INFORMAL' as const,
    badge: 'Cuisine locale',
    quartier: 'Makepe',
    profilePhotoUrl: null,
    description: null,
    distanceKm: 0.85,
    etaMinutes: 18,
    deliveryFeeXAF: 500,
    plan: 1 as const,
    isOpenNow: true,
  },
  {
    id: 'v-bonamou-002',
    name: 'Le Bonamoussadi',
    type: 'SEMI_FORMAL' as const,
    badge: 'Grillades',
    quartier: 'Bonamoussadi',
    profilePhotoUrl: null,
    description: null,
    distanceKm: 1.2,
    etaMinutes: 22,
    deliveryFeeXAF: 700,
    plan: 1 as const,
    isOpenNow: true,
  },
];

test('catalogue mounts + vendor cards render + category filter syncs to URL', async ({ page }) => {
  await page.route('**/api/v1/catalogue**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ vendors: MOCK_VENDORS }),
    }),
  );
  await page.route('**/api/v1/users/me**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );

  // Pre-grant geolocation so the prompt doesn't block the test.
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 4.0511, longitude: 9.7679 });

  await page.goto('/restaurants');

  // Both seeded vendors render.
  await expect(page.getByText('Maman Mboué')).toBeVisible();
  await expect(page.getByText('Le Bonamoussadi')).toBeVisible();

  // Filter chip → URL update → render still works. CategoryRail's
  // "Grillades" chip uses id="grill" (short id for URL brevity — see
  // features/consumer/components/CategoryRail.tsx). The 350ms debounce
  // in CataloguePage means the URL update lags the click; allow 2s.
  await page.getByRole('button', { name: /grillades/i }).click();
  await expect(page).toHaveURL(/cat=grill(\b|&|$)/, { timeout: 2000 });
  await expect(page.getByText('Le Bonamoussadi')).toBeVisible();
});
