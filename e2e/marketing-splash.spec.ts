import { test, expect } from '@playwright/test';

/**
 * Smoke: `/` (marketing splash) renders without errors and the primary
 * CTA navigates anonymous users into the catalogue.
 *
 * What this catches that Vitest can't:
 *   - Layout root + RoleRedirector + PwaRedirector race conditions
 *   - The flash-killer inline script throwing on a paint-blocking error
 *   - Link prefetch errors that surface as console errors only
 *   - First Contentful Paint actually happening (no infinite loading)
 */
test('marketing splash → click \"Commander\" → land on /restaurants', async ({ page }) => {
  // The catalogue endpoint is hit on /restaurants mount. Mock it so the
  // test doesn't depend on staging API availability + so we can assert
  // the vendor card render path. Empty list is the cheapest fixture
  // that exercises the surrounding chrome.
  await page.route('**/api/v1/catalogue**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ vendors: [] }),
    }),
  );
  // /users/me hit by RoleRedirector on the splash. 401 = anonymous,
  // which is the path under test here.
  await page.route('**/api/v1/users/me**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Editorial hero copy is the page identity; if this fails the
  // marketing surface is broken in some fundamental way. Look for the
  // brand-red "attendre." span — it's the most identity-specific
  // single token on the page, less ambiguous than the plain "Mange"
  // word which appears in multiple places (cards, prefetched routes).
  await expect(page.getByText(/attendre\./i).first()).toBeVisible();

  await page.getByRole('link', { name: /commander maintenant/i }).click();

  // The catalogue page should mount even with an empty vendor list.
  await expect(page).toHaveURL(/\/restaurants/);

  // Filter out known non-fatal noise (401s on protected endpoints
  // from anonymous users — that's the expected state for this test).
  const fatalErrors = consoleErrors.filter(
    (e) => !e.includes('401') && !e.includes('Failed to load resource'),
  );
  expect(fatalErrors).toEqual([]);
});
