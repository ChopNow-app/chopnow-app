'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { usePushSubscription } from '../hooks/usePushSubscription';

/**
 * One-shot banner that surfaces a clear "Activate notifications" CTA on the
 * vendor dashboard.
 *
 * Why a custom banner instead of calling `Notification.requestPermission()`
 * silently on mount:
 *   - Browsers permanently down-rank or auto-deny sites that prompt without
 *     user intent. Wrapping the call in an explicit tap preserves the
 *     re-prompt budget for if the user dismisses without choosing.
 *   - Vendors who deny see a one-time explanation, then we never nag.
 *   - On unsupported platforms (older iOS without PWA install) the banner
 *     stays hidden — WhatsApp fallback handles them silently.
 */
export function VendorPushPermissionBanner(): React.ReactElement | null {
  const t = useTranslations('Vendor');
  const { state, request } = usePushSubscription();
  const [pending, setPending] = React.useState(false);

  // Show only when the user is actually able to opt in. 'subscribed' /
  // 'denied' / 'unsupported' / errors → render nothing so we don't clutter
  // the kitchen-busy dashboard.
  if (state.status !== 'prompt' && state.status !== 'subscribing') return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-chop-red-light bg-chop-red-light/50 shadow-card">
      {/* Left chop-red accent bar replaces the icon-in-circle anatomy —
          same "this needs attention" affordance, typographic instead of
          iconographic. */}
      <div className="flex">
        <div aria-hidden className="w-1 shrink-0 bg-chop-red" />
        <div className="flex-1 p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-chop-red">
            {t('pushBannerEyebrow')}
          </p>
          <p className="mt-1.5 text-sm font-extrabold text-chop-ink">{t('pushBannerTitle')}</p>
          <p className="mt-0.5 text-xs text-chop-ink-secondary">{t('pushBannerBody')}</p>
          <Button
            type="button"
            size="sm"
            disabled={pending || state.status === 'subscribing'}
            onClick={async () => {
              setPending(true);
              try {
                await request();
              } finally {
                setPending(false);
              }
            }}
            className="mt-3 w-full bg-chop-red text-sm font-semibold text-white hover:bg-chop-red/90 disabled:opacity-50"
          >
            {state.status === 'subscribing' ? '…' : t('pushBannerCta')}
          </Button>
        </div>
      </div>
    </div>
  );
}
