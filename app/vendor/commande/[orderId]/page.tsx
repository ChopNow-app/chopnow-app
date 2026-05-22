import { OrderAcceptanceScreen } from '@/features/vendor/components/OrderAcceptanceScreen';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function VendorOrderAcceptancePage({ params }: PageProps) {
  const { orderId } = await params;
  return <OrderAcceptanceScreen orderId={orderId} />;
}
