'use client';

import * as React from 'react';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';

// Per ADR-0005 §S2 — INFORMAL vendors request on-demand cashout. Admin
// approves before money moves. Vendor sees the request go from PENDING
// to either APPROVED or REJECTED via the WhatsApp notification.

export interface CashoutRequestResult {
  requestId: string;
  requestedXAF: number;
  isTrusted: boolean;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function useVendorCashout() {
  const [status, setStatus] = React.useState<Status>('idle');
  const [result, setResult] = React.useState<CashoutRequestResult | null>(null);
  const [error, setError] = React.useState<{ code?: string; message: string } | null>(null);

  const requestCashout = React.useCallback(async () => {
    setStatus('submitting');
    setError(null);
    try {
      const r = await apiRaw.post<CashoutRequestResult>('/api/vendors/me/cashout-request', {});
      setResult(r);
      setStatus('success');
      return r;
    } catch (err) {
      if (err instanceof ApiClientError) {
        const body = err.body as { code?: string; message?: string } | undefined;
        const code = body?.code;
        let msg = body?.message ?? `Erreur ${err.status}`;
        if (code === 'cashout_request_only_for_informal') {
          msg = 'Les virements sur demande sont réservés aux vendeurs informels.';
        } else if (code === 'cashout_request_already_pending') {
          msg = 'Une demande est déjà en cours. Patiente la décision de l’admin.';
        } else if (code === 'cashout_request_no_balance') {
          msg = 'Aucun solde disponible pour le moment.';
        } else if (code === 'vendor_not_active') {
          msg = 'Ton compte n’est pas encore actif.';
        }
        setError({ code, message: msg });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Erreur inconnue',
        });
      }
      setStatus('error');
      return null;
    }
  }, []);

  const reset = React.useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, requestCashout, reset };
}
