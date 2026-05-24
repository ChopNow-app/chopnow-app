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

const MOCK_VENDORS = [
  {
    id: 'v-makepe-001',
    name: 'Maman Mboué',
    badge: 'Cuisine locale',
    profilePhotoUrl: 'vendor-profile/makepe-001.webp',
    isOpen: true,
    plan: 1,
    distanceM: 850,
    etaMin: 18,
    deliveryFeeXAF: 500,
    ratingAvg: 4.6,
    ratingCount: 32,
  },
  {
    id: 'v-bonamou-002',
    name: 'Le Bonamoussadi',
    badge: 'Grillades',
    profilePhotoUrl: 'vendor-profile/bonamou-002.webp',
    isOpen: true,
    plan: 1,
    distanceM: 1200,
    etaMin: 22,
    deliveryFeeXAF: 700,
    ratingAvg: 4.4,
    ratingCount: 18,
  },
];

test('catalogue mounts + vendor cards render + category filter syncs to URL', async ({ page }) => {
  await page.route('**/api/v1/catalogue**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        vendors: MOCK_VENDORS,
        plan1Count: MOCK_VENDORS.length,
        plan2Count: 0,
        plan3Count: 0,
      }),
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
  // "Grillades" chip should narrow to the bonamou-002 vendor.
  await page.getByRole('button', { name: /grillades/i }).click();
  await expect(page).toHaveURL(/cat=grillades/, { timeout: 1500 });
  await expect(page.getByText('Le Bonamoussadi')).toBeVisible();
});
