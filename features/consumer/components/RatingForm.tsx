'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';

/**
 * Story 3.9 — post-delivery rating. Triggered from /orders/[id] when
 * status=DELIVERED. Backend enforces:
 *   - one rating per order (orderId @unique)
 *   - 24h window from deliveredAt
 *   - both scores 1..5 (DB CHECK constraint)
 *
 * UX: 5-star picker × 2 (vendor + rider) + optional 200-char comment.
 * On 409 / already-rated, we still show the success state — the user
 * doesn't need to know they double-submitted.
 */
export function RatingForm({
  orderId,
  vendorName,
  onSubmitted,
}: {
  orderId: string;
  vendorName: string;
  onSubmitted: () => void;
}) {
  const [vendorScore, setVendorScore] = React.useState(0);
  const [riderScore, setRiderScore] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (success) {
    return (
      <div className="bg-card rounded-lg border p-4 text-center">
        <p className="text-base font-semibold">🙏 Merci pour ta note !</p>
        <p className="mt-1 text-xs text-muted-foreground">Ton retour aide à améliorer ChopNow.</p>
      </div>
    );
  }

  const canSubmit = vendorScore > 0 && riderScore > 0 && !submitting;

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiRaw.post(`/api/orders/${orderId}/rating`, {
        vendorScore,
        riderScore,
        comment: comment.trim() || undefined,
      });
      setSuccess(true);
      onSubmitted();
    } catch (err) {
      if (err instanceof ApiClientError) {
        const body = err.body as { code?: string; message?: string } | undefined;
        if (body?.code === 'order_already_rated') {
          // Treat as success — backend rejects the double-submit but the
          // user's intent ("I rated this") was already fulfilled the first
          // time. No point shaming them.
          setSuccess(true);
          onSubmitted();
          return;
        }
        if (body?.code === 'rating_window_expired') {
          setError('Le délai de 24h pour noter est dépassé.');
          return;
        }
        setError(body?.message ?? `Erreur ${err.status}`);
        return;
      }
      setError((err as Error).message ?? 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-base font-semibold">Comment était ta commande ?</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Ton retour aide les autres clients et améliore le service.
      </p>

      <div className="mt-4 space-y-4">
        <StarRow label={`Note ${vendorName}`} value={vendorScore} onChange={setVendorScore} />
        <StarRow label="Note livreur" value={riderScore} onChange={setRiderScore} />

        <div>
          <label htmlFor="comment" className="mb-1 block text-sm font-semibold">
            Commentaire <span className="text-xs text-muted-foreground">(optionnel)</span>
          </label>
          <Input
            id="comment"
            placeholder="Plat délicieux, livraison rapide…"
            maxLength={200}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">{comment.length} / 200</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="button" disabled={!canSubmit} onClick={onSubmit} className="w-full">
          {submitting ? 'Envoi…' : 'Envoyer ma note'}
        </Button>
      </div>
    </div>
  );
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            className={`text-3xl transition ${
              n <= value ? 'text-chop-orange' : 'text-muted-foreground/40'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
