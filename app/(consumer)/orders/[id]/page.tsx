import { OrderTrackingPage } from '@/features/consumer/components/OrderTrackingPage';

// Story 3.6 — order status timeline + polling. Auth-gated at the component
// level so 401 surfaces a clear "Connecte-toi" panel.
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderTrackingPage orderId={id} />;
}
