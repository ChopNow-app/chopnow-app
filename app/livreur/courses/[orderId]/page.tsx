import { CourseDetailPage } from '@/features/livreur/components/CourseDetailPage';

// Stories 4.2 / 4.17 — rider course detail with pickup / delivered transitions
// and the masked-call button to the consumer.
export default async function CourseRoute({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <CourseDetailPage orderId={orderId} />;
}
