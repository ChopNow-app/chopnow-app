'use client';

import * as Sentry from '@sentry/nextjs';
import * as React from 'react';

/**
 * Last-resort error boundary — Next.js mounts this when an error escapes
 * even from `app/layout.tsx` itself (e.g., Provider crash, font load
 * failure during SSR). Renders its OWN <html>/<body> because the normal
 * layout never executed.
 *
 * Cannot import from @/components/ui/* — those depend on Tailwind, which
 * depends on globals.css, which is imported by the normal layout we just
 * failed to render. Inline styles only. System-font stack.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Global error = layout / Provider failure → even Sentry's
    // Next.js wrapper might not have initialized cleanly. We still
    // try (no-op if init failed) so any future fix to the layout
    // crash benefits from the breadcrumb trail.
    Sentry.captureException(error, {
      tags: { source: 'global-error', digest: error.digest ?? 'none' },
    });

    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#FAFAF7',
          color: '#0F0F0F',
          fontFamily:
            "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textAlign: 'center',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ maxWidth: 380 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: '#E11D2A',
              color: 'white',
              fontWeight: 800,
              fontSize: 36,
              letterSpacing: '-0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
            aria-hidden
          >
            T
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            L&apos;app n&apos;a pas pu démarrer.
          </h1>
          <p style={{ marginTop: 12, fontSize: 16, color: '#525252', lineHeight: 1.4 }}>
            Quelque chose a coupé avant qu&apos;on ait pu charger l&apos;interface. Réessaie ; si ça
            persiste, recharge la page.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: 16,
                fontSize: 12,
                color: '#898989',
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              }}
            >
              Code : {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              padding: '14px 28px',
              minHeight: 48,
              border: 0,
              borderRadius: 999,
              background: '#E11D2A',
              color: 'white',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
