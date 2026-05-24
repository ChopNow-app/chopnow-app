import { test, expect } from '@playwright/test';

/**
 * Smoke: `/login` OTP flow — phone entry → request OTP → verify form
 * appears. Real OTP delivery is out of scope (would require WhatsApp);
 * we mock the backend response so the UI transition is what's tested.
 *
 * What this catches that Vitest can't:
 *   - The full react-hook-form + zod + PhoneInput composition rendering
 *     in a Next.js App Router page (not in a unit-test wrapper)
 *   - The state transition `phone === null` → `phone === '6XXXXXXXX'`
 *     that flips the form from request-OTP step to verify-OTP step
 *   - sanitizeNext() proxy.ts behavior when no ?next= present (login
 *     should land on /restaurants post-verify; we don't drive that
 *     here, but the absence of error suggests the wiring is intact)
 *   - The Turnstile captcha state — backend returns enabled:false so
 *     no widget mounts (which is the pilot-default config)
 */

test('OTP request form → submit → OTP verify step renders', async ({ page }) => {
  // Captcha config: disabled in the pilot. Mocking false avoids
  // loading the Turnstile script + iframe in the test.
  // Note: captcha-config IS under /v1/ — see backend admin module.
  await page.route('**/api/v1/auth/captcha-config**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, siteKey: null }),
    }),
  );

  // OTP request endpoint — consumer auth routes (request-otp, verify-
  // otp) use /api/auth/* directly, NOT /api/v1/auth/*. The form treats
  // a 200 with { ok: true } as success and advances to the verify step.
  await page.route('**/api/auth/request-otp**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, expiresInSeconds: 300 }),
    }),
  );

  // RoleRedirector + boot.ts both hit /users/me + /auth/refresh on mount.
  await page.route('**/api/v1/users/me**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/api/v1/auth/refresh**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );

  await page.goto('/login');

  // Step 1: phone entry. The PhoneInput is a textbox with a +237 prefix
  // chip + 9-digit numeric input.
  const phoneInput = page.getByPlaceholder(/6XX XXX XXX/i);
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill('670000000');

  await page.getByRole('button', { name: /recevoir le code/i }).click();

  // Step 2: verify-OTP form. The hero copy flips from "Bon retour" to
  // "Code de vérification" — that's the deterministic indicator of the
  // state transition.
  await expect(page.getByText(/code de vérification/i)).toBeVisible();

  // The phone number is echoed back to the user in the verify step's
  // sub-copy so they can confirm it before entering the code.
  await expect(page.getByText(/670/)).toBeVisible();
});
