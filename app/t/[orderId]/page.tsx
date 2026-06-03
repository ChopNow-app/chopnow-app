import { PublicOrderTracker } from '@/features/track/components/PublicOrderTracker';

// Public order-tracking page. No auth required. The orderId UUID is itself
// the access token — anyone with the link can see status (vendor name +
// lifecycle timestamps) but no PII (no phone, no address, no codes).
//
// Use case: customer shares the link with a friend/family via WhatsApp so
// they can follow the order without installing the app or signing in.
export default async function PublicTrackPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <PublicOrderTracker orderId={orderId} />;
}

export const metadata = {
  title: 'Suivi de commande — Tchop NoW',
  robots: { index: false, follow: false }, // share links shouldn't appear in search engines.
};
