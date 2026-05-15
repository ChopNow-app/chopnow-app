// Public order tracker — no auth required. Plain fetch so the api-client's
// JWT refresh flow doesn't trip on a visitor who isn't logged in.

export type PublicOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ACCEPTED'
  | 'IN_PREP'
  | 'READY_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUSED'
  | 'EXPIRED';

export interface PublicOrderView {
  id: string;
  code: string;
  status: PublicOrderStatus;
  placedAt: string;
  acceptedAt: string | null;
  preparedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  vendor: { name: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchPublicOrder(orderId: string): Promise<PublicOrderView> {
  const url = `${API_URL}/api/orders/${encodeURIComponent(orderId)}/public`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) {
    const err = new Error('order_not_found');
    (err as Error & { code: 'not_found' }).code = 'not_found';
    throw err;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as PublicOrderView;
}
