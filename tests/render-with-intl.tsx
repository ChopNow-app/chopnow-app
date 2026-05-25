import * as React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import frMessages from '@/messages/fr.json';

/**
 * Custom test renderer that wraps the UI in `NextIntlClientProvider`.
 *
 * Required for any component that calls `useTranslations()` — without
 * the provider the hook throws (no `MISSING_MESSAGE` fallback in client
 * mode). Pre-i18n tests don't need this; new tests for translated
 * components should switch to `renderWithIntl(...)` and assert against
 * the French strings from `messages/fr.json` (the pilot default).
 *
 * Use `renderWithIntl(<Foo />, { locale: 'en' })` to assert English copy
 * — the EN bundle is loaded lazily so we don't pay for it on every render.
 */
export async function renderWithIntl(
  ui: React.ReactElement,
  opts: RenderOptions & { locale?: 'fr' | 'en' } = {},
) {
  const { locale = 'fr', ...rest } = opts;
  const messages = locale === 'en' ? (await import('@/messages/en.json')).default : frMessages;
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    ),
    ...rest,
  });
}

/**
 * Sync variant — uses the French bundle bundled at module-eval time so
 * tests can stay synchronous. Re-export for ergonomics.
 */
export function renderWithIntlSync(ui: React.ReactElement, opts: RenderOptions = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        {children}
      </NextIntlClientProvider>
    ),
    ...opts,
  });
}
