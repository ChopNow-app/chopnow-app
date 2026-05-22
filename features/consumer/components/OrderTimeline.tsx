'use client';

import * as React from 'react';
import type { OrderStatus, OrderView } from '../hooks/useOrder';

/**
 * Story 3.6 — 5-step status timeline visualisation. Maps the backend's
 * full status enum onto the 5 user-visible milestones the spec describes.
 */
interface Step {
  key: string;
  label: string;
  icon: string;
  description: (o: OrderView) => string;
  reached: (s: OrderStatus, o: OrderView) => boolean;
}

const STEPS: Step[] = [
  {
    key: 'confirmed',
    label: 'Confirmée',
    icon: '✅',
    description: () => 'Paiement reçu, commande envoyée au vendeur.',
    reached: (_s, o) => !!o.placedAt,
  },
  {
    key: 'in_prep',
    label: 'En préparation',
    icon: '👨‍🍳',
    description: () => 'Le vendeur a accepté, cuisine en cours.',
    reached: (s) =>
      s === 'ACCEPTED' ||
      s === 'IN_PREP' ||
      s === 'READY_PICKUP' ||
      s === 'PICKED_UP' ||
      s === 'DELIVERED',
  },
  {
    key: 'rider_assigned',
    label: 'Livreur en route',
    icon: '🛵',
    description: () => 'Un livreur a pris ta commande en charge.',
    reached: (s) => s === 'READY_PICKUP' || s === 'PICKED_UP' || s === 'DELIVERED',
  },
  {
    key: 'picked_up',
    label: 'En route vers toi',
    icon: '📦',
    description: () => 'Commande récupérée — le livreur arrive.',
    reached: (s) => s === 'PICKED_UP' || s === 'DELIVERED',
  },
  {
    key: 'delivered',
    label: 'Livrée',
    icon: '🎉',
    description: () => 'Commande remise. Bon appétit !',
    reached: (s) => s === 'DELIVERED',
  },
];

export function OrderTimeline({ order }: { order: OrderView }) {
  // Terminal failure cases get a dedicated banner instead of the timeline.
  if (order.status === 'CANCELLED') {
    return (
      <div className="rounded-lg border bg-background p-4">
        <p className="text-base font-semibold text-destructive">Commande annulée</p>
        {order.refusalReason ? (
          <p className="mt-1 text-sm text-muted-foreground">{order.refusalReason}</p>
        ) : null}
      </div>
    );
  }
  if (order.status === 'REFUSED' || order.status === 'EXPIRED') {
    // The backend stores raw refusal codes (enum value, or "EXPIRED_NO_VENDOR_RESPONSE"
    // from the auto-refuse cron). The consumer should never see those raw codes —
    // they need a French sentence they can act on.
    const friendlyReason = humanizeRefusal(order.refusalReason ?? null);
    const isAutoExpire = order.refusalReason === 'EXPIRED_NO_VENDOR_RESPONSE';
    return (
      <div className="rounded-lg border bg-background p-4">
        <p className="text-base font-semibold text-destructive">
          {isAutoExpire
            ? "Le restaurant n'a pas répondu à temps"
            : order.status === 'REFUSED'
              ? 'Le restaurant a refusé la commande'
              : "Le restaurant n'a pas répondu à temps"}
        </p>
        {friendlyReason ? (
          <p className="mt-1 text-sm text-muted-foreground">{friendlyReason}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {order.paymentStatus === 'PAID'
            ? 'Remboursement automatique en cours.'
            : 'Aucun montant débité.'}
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {STEPS.map((step) => {
        const reached = step.reached(order.status, order);
        const isCurrent = isCurrentStep(step.key, order);
        return (
          <li
            key={step.key}
            className={`flex items-start gap-3 rounded-lg border bg-background p-3 ${
              reached ? '' : 'opacity-40'
            } ${isCurrent ? 'border-chop-red' : ''}`}
          >
            <span className="text-2xl">{step.icon}</span>
            <div className="min-w-0">
              <p className="font-semibold">{step.label}</p>
              {reached ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{step.description(order)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function isCurrentStep(stepKey: string, order: OrderView): boolean {
  switch (stepKey) {
    case 'confirmed':
      return order.status === 'PENDING' || order.status === 'CONFIRMED';
    case 'in_prep':
      return order.status === 'ACCEPTED' || order.status === 'IN_PREP';
    case 'rider_assigned':
      return order.status === 'READY_PICKUP';
    case 'picked_up':
      return order.status === 'PICKED_UP';
    case 'delivered':
      return order.status === 'DELIVERED';
    default:
      return false;
  }
}

// Map raw refusal codes (vendor enum + auto-cron sentinel) to a French sentence
// the consumer can understand. Stays as a lookup rather than i18n keys because
// the codebase is French-only for now.
function humanizeRefusal(reason: string | null): string | null {
  if (!reason) return null;
  // The vendor refuse DTO can append a free-text note ("OTHER: too far"). The
  // enum value is everything before the first colon; the note (if any) is
  // shown verbatim after.
  const [code, ...rest] = reason.split(':');
  const note = rest.join(':').trim();
  const map: Record<string, string> = {
    ITEM_OUT_OF_STOCK: 'Plat épuisé.',
    CLOSED: 'Restaurant fermé.',
    TOO_MANY_ORDERS: 'Restaurant trop chargé pour le moment.',
    POWER_OUTAGE: 'Coupure de courant chez le restaurant.',
    OTHER: 'Autre motif.',
    EXPIRED_NO_VENDOR_RESPONSE:
      'Aucune réponse du restaurant dans le temps imparti — il était probablement occupé.',
  };
  const label = map[code.trim()] ?? code.trim();
  return note ? `${label} (${note})` : label;
}
