import { OrderPreparationScreen } from '@/features/vendor/components/OrderPreparationScreen';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function VendorOrderPreparationPage({ params }: PageProps) {
  const { orderId } = await params;
  return <OrderPreparationScreen orderId={orderId} />;
}
