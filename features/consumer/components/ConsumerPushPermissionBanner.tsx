'use client';

// React 19's react-hooks/set-state-in-effect rule trips on the natural
// pattern of bridging browser-only APIs (sessionStorage, localStorage)
// into React state on mount. Same precedent as useCatalogue.ts and
// OrdersListPage.tsx — those APIs are unavailable during SSR.
/* eslint-disable react-hooks/set-state-in-effect */

import { X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { usePushSubscription } from '@/features/vendor/hooks/usePushSubscription';
import { toast } from '@/hooks/use-toast';
import { recordPageView } from '@/lib/pwa/page-view-counter';

const DISMISSAL_KEY = 'chopnow.consumerPushBannerDismissedAt';
// 30 days — long enough that users aren't nagged, short enough that we
// re-surface for users who've been around the app since their first dismiss.
const DISMISSAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Don't surface on the user's first impression — let them browse food first.
// Triggers from the 2nd page-view onwards (counted across the session).
const MIN_PAGE_VIEWS = 2;

/**
 * Consumer-facing contextual push-permission banner.
 *
 * Why contextual instead of cold-call:
 *   - First impression should be food, not a system prompt. Browsers also
 *     down-rank or auto-deny sites that prompt without intent.
 *   - We surface this from the 2nd page-view (user has shown intent by
 *     navigating) and only when permission isn't already decided.
 *
 * Persistence:
 *   - Dismissal stored in localStorage with a 30-day TTL — long enough
 *     that the user isn't nagged, short enough that we re-surface once
 *     they've actually used the app for a while.
 *
 * Mount points: CataloguePage (/restaurants) + OrdersListPage (/orders).
 * These are where the push value-prop ("alert me when food arrives") is
 * tangible — a /vendors/[id] page or the cart is the wrong moment.
 *
 * Mirrors the vendor banner pattern but with consumer-appropriate copy
 * and a dismiss control (vendors don't get one; they need notifications
 * to do their job, consumers can opt out cleanly).
 */
export function ConsumerPushPermissionBanner(): React.ReactElement | null {
  const { state, request } = usePushSubscription();
  const [pageViews, setPageViews] = React.useState(0);
  const [dismissed, setDismissed] = React.useState(true); // assume dismissed until effect resolves to avoid flash-mount
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setPageViews(recordPageView());
    setDismissed(isDismissedRecently());
  }, []);

  // Fire a one-shot success toast on the state transition prompt → subscribed
  // so the user gets explicit confirmation. The banner itself unmounts on
  // 'subscribed', so without this the action would complete silently.
  const prevStatus = React.useRef(state.status);
  React.useEffect(() => {
    if (prevStatus.current !== 'subscribed' && state.status === 'subscribed') {
      toast({
        variant: 'success',
        title: 'Notifications activées',
        description: 'Tu seras prévenu·e dès que ta commande progresse.',
      });
    }
    prevStatus.current = state.status;
  }, [state.status]);

  if (dismissed) return null;
  if (pageViews < MIN_PAGE_VIEWS) return null;
  // Only the "prompt" / "subscribing" branches deserve UI — we don't want
  // to render a denied user a banner they can't act on, or re-prompt an
  // already-subscribed user.
  if (state.status !== 'prompt' && state.status !== 'subscribing') return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-chop-red-light bg-chop-red-light/40 shadow-card">
      <div className="flex items-start gap-3 p-4">
        <span aria-hidden className="text-2xl leading-none">
          🔔
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-chop-ink">Reçois une alerte quand ton plat arrive</p>
          <p className="mt-0.5 text-xs text-chop-ink-secondary">
            Active les notifications pour suivre ta commande sans rouvrir l&apos;app.
          </p>
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
            className="mt-3 bg-chop-red text-sm font-semibold text-white hover:bg-chop-red/90 disabled:opacity-50"
          >
            {state.status === 'subscribing' ? '…' : 'Activer'}
          </Button>
        </div>
        <button
          type="button"
          aria-label="Masquer cette suggestion"
          onClick={() => {
            persistDismissal();
            setDismissed(true);
          }}
          className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-chop-ink-secondary transition-colors hover:bg-chop-red-light/80 hover:text-chop-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const at = Number(window.localStorage.getItem(DISMISSAL_KEY) ?? '0');
    if (!at) return false;
    return Date.now() - at < DISMISSAL_TTL_MS;
  } catch {
    return false;
  }
}

function persistDismissal(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
  } catch {
    /* private mode, localStorage full, etc. — silently degrade */
  }
}
