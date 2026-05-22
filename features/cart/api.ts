import { ApiClientError, apiRaw } from '@/lib/api/api-client';

/**
 * Order placement helper. Wraps POST /api/orders with the X-Idempotency-Key
 * header (Story 3.14 server-side enforcement). The caller provides the key
 * so retries from a network failure surface the same order id rather than
 * creating a duplicate.
 *
 * Uses apiRaw (not the typed `api` client) because openapi-fetch doesn't
 * expose request headers per-call cleanly — and the backend doesn't yet
 * declare X-Idempotency-Key in the OpenAPI schema.
 */

export type PaymentMethod = 'MTN_MOMO' | 'ORANGE_MONEY';

export interface PlaceOrderInput {
  vendorId: string;
  items: Array<{ itemId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  noteForVendor?: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryQuartier: string;
  deliveryLandmark?: string;
  deliveryDescription?: string;
  deliveryPhone: string;
  /**
   * Pre-orders (#187): when set (ISO 8601), the order is scheduled for that
   * time. Omit / undefined for immediate delivery (today's flow). Vendor must
   * have `acceptsPreOrders: true` else the backend rejects with
   * `pre_orders_not_accepted_by_this_vendor`.
   */
  scheduledFor?: string;
}

export interface PlacedOrder {
  id: string;
  code: string;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  subtotalXAF: number;
  deliveryFeeXAF: number;
  totalXAF: number;
}

/** Surface backend codes 1:1 so the UI can branch on the structured `code` field. */
export interface OrderError {
  code: string;
  message: string;
}

function extractCode(err: ApiClientError): OrderError {
  const body = err.body as { code?: string; message?: string } | undefined;
  return {
    code: body?.code ?? `http_${err.status}`,
    message: body?.message ?? `Erreur ${err.status}`,
  };
}

export async function placeOrder(
  input: PlaceOrderInput,
  idempotencyKey: string,
): Promise<PlacedOrder> {
  try {
    return await apiRaw.post<PlacedOrder>('/api/v1/orders', input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  } catch (err) {
    if (err instanceof ApiClientError) {
      const e = extractCode(err);
      const customError = new Error(e.message) as Error & OrderError;
      customError.code = e.code;
      throw customError;
    }
    throw err;
  }
}

export interface MomoPayResult {
  reference: string;
  status: string;
  message: string;
}

export async function initiateMomo(orderId: string, payerPhone: string): Promise<MomoPayResult> {
  try {
    return await apiRaw.post<MomoPayResult>(`/api/v1/orders/${orderId}/pay/momo`, {
      payerPhone,
    });
  } catch (err) {
    if (err instanceof ApiClientError) {
      const e = extractCode(err);
      const customError = new Error(e.message) as Error & OrderError;
      customError.code = e.code;
      throw customError;
    }
    throw err;
  }
}
