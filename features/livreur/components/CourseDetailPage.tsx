'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { useRiderCourses, type RiderCourse } from '../hooks/useRiderCourses';
import { DeliveryMap } from './DeliveryMap';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export function CourseDetailPage({ orderId }: { orderId: string }) {
  const courses = useRiderCourses();
  const router = useRouter();

  if (courses.status === 'unauthenticated') {
    return (
      <div className="rounded-2xl border border-chop-dark-border p-6 text-center">
        <h2 className="text-lg font-semibold">Connexion requise</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/login?next=/livreur/courses/${orderId}`}>Se connecter</Link>
        </Button>
      </div>
    );
  }
  if (courses.status === 'loading') return <Skeleton />;
  if (courses.status === 'error') {
    return <p className="text-red-300">{courses.message}</p>;
  }

  const course = courses.courses.find((c) => c.id === orderId);
  if (!course) {
    return (
      <div className="text-center">
        <p className="text-white/70">Course introuvable (peut-être terminée).</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/livreur">← Retour</Link>
        </Button>
      </div>
    );
  }

  return <CourseContent course={course} onAdvance={courses.reload} router={router} />;
}

function CourseContent({
  course,
  onAdvance,
  router,
}: {
  course: RiderCourse;
  onAdvance: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [busy, setBusy] = React.useState<null | 'pickup' | 'deliver' | 'call'>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Story 4.13 — rider types the 4-digit code they got from the vendor /
  // consumer in person. The two codes are independent — rider may know the
  // pickup code already (vendor showed at pickup) but the delivery code
  // only at drop-off, so we keep them in separate state.
  const [pickupCodeInput, setPickupCodeInput] = React.useState('');
  const [deliveryCodeInput, setDeliveryCodeInput] = React.useState('');

  const pickup = async () => {
    setBusy('pickup');
    setError(null);
    try {
      await apiRaw.patch(`/api/v1/riders/me/courses/${course.id}/picked-up`, {
        code: pickupCodeInput,
      });
      setPickupCodeInput('');
      onAdvance();
    } catch (err) {
      setError(extract(err) ?? 'Impossible de marquer comme récupérée');
    } finally {
      setBusy(null);
    }
  };

  const deliver = async () => {
    setBusy('deliver');
    setError(null);
    try {
      await apiRaw.patch(`/api/v1/riders/me/courses/${course.id}/delivered`, {
        code: deliveryCodeInput,
      });
      router.replace('/livreur');
    } catch (err) {
      setError(extract(err) ?? 'Impossible de marquer comme livrée');
      setBusy(null);
    }
  };

  const callConsumer = async () => {
    setBusy('call');
    setError(null);
    try {
      await apiRaw.post(`/api/v1/orders/${course.id}/call-consumer`, {});
      window.alert(
        "Appel en cours — décroche ton téléphone. Le client va recevoir l'appel après que tu auras décroché.",
      );
    } catch (err) {
      setError(extract(err) ?? "L'appel n'a pas pu démarrer");
    } finally {
      setBusy(null);
    }
  };

  const isPickedUp = course.status === 'PICKED_UP';

  return (
    <div className="space-y-6">
      <header>
        <Link href="/livreur" className="text-xs text-white/60">
          ← Tableau de bord
        </Link>
        <h1 className="mt-2 font-mono text-2xl font-extrabold">{course.code}</h1>
      </header>

      {/* Pickup card */}
      <section className="rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-4">
        <p className="text-xs uppercase tracking-widest text-white/50">Point de retrait</p>
        <p className="mt-1 text-lg font-bold">{course.vendor.name}</p>
        <p className="text-sm text-white/70">📍 {course.vendor.quartier}</p>
      </section>

      {/* Drop-off card — Story 4.2 / 4.4: landmark in big, description below,
          Mapbox static map + Maps deep-link for orientation. */}
      <section className="space-y-3 rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50">Livraison</p>
          <p className="mt-1 text-lg font-bold">
            {course.deliveryLandmark ?? `Quartier ${course.deliveryQuartier}`}
          </p>
          {course.deliveryDescription ? (
            <p className="mt-1 text-sm text-white/70">{course.deliveryDescription}</p>
          ) : null}
        </div>
        <DeliveryMap
          lat={course.deliveryLat}
          lng={course.deliveryLng}
          label={course.deliveryLandmark ?? course.deliveryQuartier}
        />
      </section>

      {/* Order content */}
      <section className="rounded-2xl border border-chop-dark-border p-3">
        <p className="text-xs uppercase tracking-widest text-white/50">À récupérer</p>
        <ul className="mt-2 space-y-1 text-sm">
          {course.items.map((line) => (
            <li key={line.id} className="flex justify-between">
              <span>
                {line.quantity} × {line.nameSnapshot}
              </span>
              <span className="font-mono text-white/60">{formatXAF(line.lineXAF)}</span>
            </li>
          ))}
        </ul>
        {course.noteForVendor ? (
          <p className="mt-2 rounded bg-yellow-500/10 p-2 text-xs">📝 {course.noteForVendor}</p>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">{error}</p>
      ) : null}

      <div className="space-y-3">
        {!isPickedUp ? (
          <div className="space-y-2 rounded-2xl border border-chop-dark-border p-3">
            <label
              htmlFor="pickupCode"
              className="block text-xs uppercase tracking-widest text-white/60"
            >
              Code de retrait (donné par le vendeur)
            </label>
            <input
              id="pickupCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="••••"
              value={pickupCodeInput}
              onChange={(e) => setPickupCodeInput(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border border-chop-dark-border bg-chop-dark-elevated p-3 text-center font-mono text-2xl tracking-widest"
            />
            <Button
              type="button"
              size="jumbo"
              disabled={busy === 'pickup' || pickupCodeInput.length !== 4}
              onClick={pickup}
              className="w-full"
            >
              {busy === 'pickup' ? '…' : "📦 J'ai récupéré la commande"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-chop-dark-border p-3">
            <label
              htmlFor="deliveryCode"
              className="block text-xs uppercase tracking-widest text-white/60"
            >
              Code de livraison (donné par le client)
            </label>
            <input
              id="deliveryCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="••••"
              value={deliveryCodeInput}
              onChange={(e) => setDeliveryCodeInput(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border border-chop-dark-border bg-chop-dark-elevated p-3 text-center font-mono text-2xl tracking-widest"
            />
            <Button
              type="button"
              size="jumbo"
              disabled={busy === 'deliver' || deliveryCodeInput.length !== 4}
              onClick={deliver}
              className="w-full"
            >
              {busy === 'deliver' ? '…' : '🎉 Livré !'}
            </Button>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={busy === 'call'}
          onClick={callConsumer}
          className="w-full"
        >
          {busy === 'call' ? 'Appel en cours…' : '📞 Appeler le client'}
        </Button>
      </div>
    </div>
  );
}

function extract(err: unknown): string | null {
  if (err instanceof ApiClientError) {
    const body = err.body as { code?: string; message?: string } | undefined;
    // Story 4.13 — surface specific code-mismatch errors as actionable French.
    if (body?.code === 'wrong_pickup_code')
      return 'Code de retrait incorrect. Demande-le au vendeur.';
    if (body?.code === 'wrong_delivery_code')
      return 'Code de livraison incorrect. Demande-le au client.';
    return body?.message ?? `Erreur ${err.status}`;
  }
  return (err as Error)?.message ?? null;
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-10 animate-pulse rounded-2xl border border-chop-dark-border bg-chop-dark-surface" />
      <div className="h-32 animate-pulse rounded-2xl border border-chop-dark-border bg-chop-dark-surface" />
      <div className="h-32 animate-pulse rounded-2xl border border-chop-dark-border bg-chop-dark-surface" />
    </div>
  );
}
