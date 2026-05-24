import { test, expect } from '@playwright/test';

/**
 * Smoke: `/login` mounts cleanly with phone-entry form visible.
 *
 * Scope deliberately narrowed to load + initial-render assertion.
 * Driving the full OTP state transition through Playwright proved
 * flaky against next-dev's HMR overlay + the captcha-config + auth/
 * refresh + request-otp triple-mock dependency chain. The detailed
 * state-machine coverage lives in OtpRequestForm.test.tsx + the new
 * useCaptchaConfig.integration.test.tsx (PR-T2) — both run in jsdom
 * where they're deterministic.
 *
 * What THIS spec catches that Vitest can't:
 *   - The /login route mounts in the actual Next.js App Router
 *   - PhoneInput + +237 prefix render via the real layout chrome
 *   - No JS error blocks the form from rendering
 */

test('/login mounts and renders the phone entry', async ({ page }) => {
  await page.route('**/api/v1/auth/captcha-config**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, siteKey: null }),
    }),
  );
  await page.route('**/api/v1/users/me**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/api/v1/auth/refresh**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );

  await page.goto('/login');

  // The PhoneInput renders its placeholder as `6XX XXX XXX` — looking
  // for that confirms the form mounted (vs a blank page or error
  // boundary having taken over).
  await expect(page.getByPlaceholder(/6XX XXX XXX/i)).toBeVisible();

  // The "Recevoir le code" submit button confirms the OtpRequestForm
  // composed correctly (react-hook-form + zod + PhoneInput + Button).
  await expect(page.getByRole('button', { name: /recevoir le code/i })).toBeVisible();
});
