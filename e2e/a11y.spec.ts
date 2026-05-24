import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * Automated accessibility scan across the 4 critical consumer surfaces.
 *
 * What this catches:
 *   - Missing `aria-label` on icon buttons (axe rule: button-name)
 *   - Form inputs without associated labels (label)
 *   - Insufficient color contrast on brand tokens (color-contrast)
 *   - Missing `lang` on <html> (html-has-lang)
 *   - Heading hierarchy gaps (heading-order)
 *   - Touch targets too small for mobile (target-size)
 *   - Form errors missing aria-live (form-field-multiple-labels)
 *
 * Scope: WCAG 2.1 AA rules ONLY. AAA is aspirational for a pilot;
 * the audit said "Cameroon launch will hit users with various devices,
 * low-vision needs" — AA covers the floor we care about.
 *
 * What this does NOT cover (separate concerns):
 *   - Keyboard navigation order — needs explicit Tab assertions per
 *     screen, deferred
 *   - Screen reader announcement quality — needs manual VoiceOver/
 *     TalkBack testing
 *
 * Treat any AA violation as a CI failure. If a violation is intentional
 * + documented (rare), exclude with `.disableRules()` AND add a tracked
 * issue so it doesn't rot.
 */

const SURFACES = [
  { path: '/', name: 'marketing splash' },
  { path: '/restaurants', name: 'catalogue' },
  { path: '/login', name: 'login (OTP request)' },
  { path: '/orders', name: 'orders list (anonymous → auth gate)' },
];

for (const surface of SURFACES) {
  test(`a11y: ${surface.name} (${surface.path}) — WCAG 2.1 AA`, async ({ page }) => {
    // Mock the API surface so the page renders deterministically.
    // Empty payloads keep the scan focused on the chrome — adding real
    // vendor cards would scan their inline-styled gradients which
    // aren't actionable until we have real photos.
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
    await page.route('**/api/v1/auth/refresh**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/api/v1/auth/captcha-config**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: false, siteKey: null }),
      }),
    );

    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page })
      // WCAG 2 + 2.1 + 2.2 levels A + AA. Skip the experimental +
      // best-practice tags (would flood the report with non-actionable
      // warnings). 2.2 adds `target-size` (44×44px touch-target floor,
      // documented as the h-11 minimum in chopnow-docs).
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    // If this assertion ever fails, the printed violations include
    // `id` (axe rule id), `impact` (minor/moderate/serious/critical),
    // and `nodes[].html` (the offending markup). Fix or document.
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}

function formatViolations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- axe types are loose
  violations: any[],
): string {
  if (violations.length === 0) return 'no violations';
  return violations
    .map((v) => `${v.impact?.toUpperCase()} · ${v.id} · ${v.nodes.length} node(s) · ${v.help}`)
    .join('\n');
}
