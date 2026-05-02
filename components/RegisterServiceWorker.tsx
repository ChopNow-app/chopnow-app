'use client';

import * as React from 'react';

export function RegisterServiceWorker() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* noop */
    });
  }, []);
  return null;
}
