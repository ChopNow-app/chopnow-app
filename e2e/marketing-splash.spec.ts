import { test, expect } from '@playwright/test';

/**
 * Smoke: `/` (marketing splash) mounts and renders the hero.
 *
 * Scope is deliberately narrow — load the page + assert the brand-red
 * "attendre." span is visible. We do NOT click through to /restaurants
 * here (catalogue.spec.ts covers that with proper mocks). Chaining
 * navigations across mocks in a single test makes diagnosis hard when
 * something fails in CI.
 *
 * What this catches that Vitest can't:
 *   - Root layout crashing on a paint-blocking error
 *   - Flash-killer inline script throwing before first paint
 *   - Hero copy not rendering due to a Next.js compile-time issue
 */

test('/ mounts and renders the hero', async ({ page }) => {
  // Mock background fetches the page triggers (catalogue prefetch via
  // <Link href="/restaurants">, /users/me via RoleRedirector) so the
  // test doesn't hit the network during sanity-check page load.
  await page.route('**/api/v1/catalogue**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ vendors: [] }),
    }),
  );
  await page.route('**/api/v1/users/me**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // "attendre." is the brand-red span in the hero — a single token
  // specific enough to confirm the editorial copy rendered.
  await expect(page.getByText(/attendre\./i).first()).toBeVisible();
});
