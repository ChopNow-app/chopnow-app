'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

// Per ADR-0005 §S2 — INFORMAL vendors request on-demand cashout. Admin
// approves before money moves. Vendor sees the request go from PENDING
// to either APPROVED or REJECTED via the WhatsApp notification.

export interface CashoutRequestResult {
  requestId: string;
  requestedXAF: number;
  isTrusted: boolean;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface CashoutError {
  code?: string;
  message: string;
}

function mapErrorBody(err: ApiClientError): CashoutError {
  const body = err.body as { code?: string; message?: string } | undefined;
  const code = body?.code;
  let message = body?.message ?? `Erreur ${err.status}`;
  if (code === 'cashout_request_only_for_informal') {
    message = 'Les virements sur demande sont réservés aux vendeurs informels.';
  } else if (code === 'cashout_request_already_pending') {
    message = 'Une demande est déjà en cours. Patiente la décision de l’admin.';
  } else if (code === 'cashout_request_no_balance') {
    message = 'Aucun solde disponible pour le moment.';
  } else if (code === 'vendor_not_active') {
    message = 'Ton compte n’est pas encore actif.';
  }
  return { code, message };
}

/**
 * On-demand cashout request. On success, the vendor's balance changes
 * (a pending request shows up + the trust state may have just flipped),
 * so we invalidate the balance query for an instant refresh in the
 * MonSoldeCard. WhatsApp notification handles the admin decision later.
 */
export function useVendorCashout() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      apiRaw.post('/api/v1/vendors/me/cashout-request', {}) as Promise<CashoutRequestResult>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vendor.balance() });
    },
  });

  const requestCashout = React.useCallback(async () => {
    try {
      const r = await mutation.mutateAsync();
      return r;
    } catch {
      // mutation.error captured by react-query for the next render
      return null;
    }
  }, [mutation]);

  const reset = React.useCallback(() => {
    mutation.reset();
  }, [mutation]);

  const status: Status = mutation.isPending
    ? 'submitting'
    : mutation.isError
      ? 'error'
      : mutation.isSuccess
        ? 'success'
        : 'idle';

  const error: CashoutError | null = mutation.error
    ? mutation.error instanceof ApiClientError
      ? mapErrorBody(mutation.error)
      : { message: mutation.error.message ?? 'Erreur inconnue' }
    : null;

  return {
    status,
    result: mutation.data ?? null,
    error,
    requestCashout,
    reset,
  };
}
