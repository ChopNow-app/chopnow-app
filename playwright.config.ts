import { defineConfig, devices } from '@playwright/test';

/**
 * E2E test config — smoke coverage of the consumer happy path.
 *
 * Scope: high-value, fast tests that catch regressions Vitest can't
 * (multi-component flows, route nav, network contract w/ mocked API).
 *
 * Server: `next dev` in CI (faster cold-start than `next build && start`
 * for a 3-spec suite). Switch to `start` when the suite exceeds ~15
 * specs and shared compile cost becomes the bottleneck.
 *
 * Browsers: Chromium only. The pilot market is overwhelmingly Chrome/
 * Chromium-based (Tecno/Itel/Infinix). Safari + Firefox added when
 * Mobile Safari coverage becomes a pilot signal.
 *
 * No SSO/auth fixtures yet — vendor + livreur + admin E2E will land
 * in a follow-up PR once we have a test-account seed flow that
 * doesn't require real WhatsApp OTP.
 */
export default defineConfig({
  testDir: './e2e',
  // Tests run sequentially. Parallel mode revealed flakes around the
  // shared dev server's HMR overlay races; keep serial for now.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // Two retries in CI absorbs the occasional cold-start flake; locally
  // a failure is real (zero retries → faster red).
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The dev server is permissive about CORS; in CI we run against
    // the same server so credentials work cleanly.
    ignoreHTTPSErrors: true,
    // Pin Playwright's browser locale to French. Required after #168
    // (i18n) — the request handler picks locale from the `chopnow.locale`
    // cookie OR the Accept-Language header (fr / en fall-through).
    // Playwright's default headless Chromium sends Accept-Language:
    // en-US, which would flip the rendered copy to English and break
    // tests that assert on French strings ("Recevoir le code",
    // "attendre.", visual baselines).
    locale: 'fr-FR',
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `next dev` boots in ~3s vs ~15s for build+start. For a smoke
    // suite this trade is worth it; production-build fidelity is
    // validated by the separate `npm run build` CI step.
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // Cold start on CI can take 30s+ on first compile of all routes.
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
