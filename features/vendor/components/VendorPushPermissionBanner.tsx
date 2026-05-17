'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';
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
  const { state, request } = usePushSubscription();
  const [pending, setPending] = React.useState(false);

  // Show only when the user is actually able to opt in. 'subscribed' /
  // 'denied' / 'unsupported' / errors → render nothing so we don't clutter
  // the kitchen-busy dashboard.
  if (state.status !== 'prompt' && state.status !== 'subscribing') return null;

  return (
    <div className="rounded-2xl border border-chop-red-light bg-chop-red-light/50 p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chop-red text-white">
          <Bell className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-chop-ink">Active les notifications</p>
          <p className="mt-0.5 text-xs text-chop-ink-secondary">
            Pour ne rater aucune commande, même quand l&apos;app est fermée.
          </p>
        </div>
      </div>
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
        {state.status === 'subscribing' ? '…' : 'Activer'}
      </Button>
    </div>
  );
}
