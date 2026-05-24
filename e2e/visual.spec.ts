import { test, expect } from '@playwright/test';

/**
 * Visual regression baselines for the 4 consumer surfaces + the offline
 * page + the 404 page.
 *
 * Pattern: Playwright's built-in `toHaveScreenshot()` against per-OS
 * baselines. NO Storybook — overkill at this scale for a 1-person
 * team. NO Chromatic / Percy — both want their own infrastructure.
 *
 * # First-time setup (bootstrap baselines)
 *
 * Visual baselines are OS- + font-rendering- dependent. The CI runner
 * is Ubuntu; if you generate baselines on macOS they won't match. So:
 *
 *   1. Push this branch to GitHub
 *   2. From a clean Ubuntu env (or via the `Update Visual Baselines`
 *      workflow_dispatch), run:
 *        npm run test:e2e:update-snapshots
 *   3. Commit the resulting *.png files under e2e/visual.spec.ts-snapshots/
 *   4. Remove the `.skip` on each test below to enable them in CI
 *
 * Until step 4, every test in this file is intentionally skipped so
 * we don't ship a perpetually-failing visual job into CI.
 *
 * # When a test fails legitimately
 *
 * A design change ships → the new screenshot diverges from baseline →
 * test fails with a diff image attached to the Playwright report.
 *   - If the change is intentional: run `--update-snapshots` locally
 *     against the CI-equivalent (Docker or GH workflow), commit the
 *     new baseline.
 *   - If the change is unintentional: revert the offending commit.
 *
 * # Tolerance
 *
 * `maxDiffPixelRatio: 0.01` means up to 1% of pixels can differ before
 * failure. Catches design regressions while tolerating font hinting +
 * sub-pixel anti-aliasing noise across Chromium patch versions.
 */

const COMMON_MOCKS = {
  catalogue: { vendors: [] },
  usersMe: { status: 401 as const, body: '{}' },
};

test.describe('Visual regression', () => {
  test('marketing splash (/)', async ({ page }) => {
    await page.route('**/api/v1/catalogue**', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COMMON_MOCKS.catalogue),
      }),
    );
    await page.route('**/api/v1/users/me**', (r) =>
      r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('marketing-splash.png', { maxDiffPixelRatio: 0.01 });
  });

  test('login (phone entry)', async ({ page }) => {
    await page.route('**/api/v1/auth/captcha-config**', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: false, siteKey: null }),
      }),
    );
    await page.route('**/api/v1/users/me**', (r) =>
      r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/api/v1/auth/refresh**', (r) =>
      r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('login.png', { maxDiffPixelRatio: 0.01 });
  });

  test('offline page', async ({ page }) => {
    await page.goto('/offline.html', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('offline.png', { maxDiffPixelRatio: 0.01 });
  });

  test('404 not-found', async ({ page }) => {
    // Next.js renders the branded app/not-found.tsx for unknown paths.
    await page.goto('/this-route-does-not-exist-and-never-will', {
      waitUntil: 'networkidle',
    });
    await expect(page).toHaveScreenshot('not-found.png', { maxDiffPixelRatio: 0.01 });
  });
});
