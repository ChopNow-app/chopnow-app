import { VendorDetailPage } from '@/features/consumer/components/VendorDetailPage';

// Story 2.6 — public vendor profile + menu. Public route.
export default async function VendorPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  return <VendorDetailPage vendorId={vendorId} />;
}
