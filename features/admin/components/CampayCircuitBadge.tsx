'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ApiClientError } from '@/lib/api/api-client';
import { adminCampayApi, type CampayCircuitState } from '../api';

// Polls /admin/finance/campay-circuit every 30s. Stays silent on 401
// (no session) and on transient errors — this is a header indicator,
// not a hard guardrail.
const POLL_INTERVAL_MS = 30_000;

export function CampayCircuitBadge() {
  const t = useTranslations('Admin');
  const [state, setState] = React.useState<CampayCircuitState | null>(null);
  const [muted, setMuted] = React.useState(false); // 401 → stop polling

  React.useEffect(() => {
    if (muted) return undefined;
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const s = await adminCampayApi.getCircuitState();
        if (!cancelled) setState(s);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          if (!cancelled) setMuted(true);
        }
        // Transient errors: keep the previous state visible.
      }
    };

    void fetchOnce();
    const id = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [muted]);

  if (muted || !state) return null;

  const tone =
    state.state === 'CLOSED'
      ? { dot: 'bg-green-500', label: t('campayBadgeOk'), text: 'text-green-800' }
      : state.state === 'HALF_OPEN'
        ? { dot: 'bg-amber-500', label: t('campayBadgeHalf'), text: 'text-amber-800' }
        : { dot: 'bg-red-500', label: t('campayBadgeOpen'), text: 'text-red-800' };

  const title =
    state.state === 'OPEN'
      ? t('campayTooltipOpen', { failures: state.consecutiveFailures })
      : state.state === 'HALF_OPEN'
        ? t('campayTooltipHalf')
        : t('campayTooltipClosed');

  return (
    <span
      className={`bg-card inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone.text}`}
      title={title}
    >
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      {tone.label}
    </span>
  );
}
