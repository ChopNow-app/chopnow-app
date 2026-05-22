'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '../hooks/useVendorOrders';

interface OrderStepperProps {
  status: OrderStatus;
  className?: string;
}

type StepKey = 'accepted' | 'preparing' | 'ready' | 'rider';

const STEPS: Array<{ key: StepKey; label: string }> = [
  { key: 'accepted', label: 'Acceptée' },
  { key: 'preparing', label: 'Préparation' },
  { key: 'ready', label: 'Prête' },
  { key: 'rider', label: 'Livreur' },
];

/**
 * Maps the OrderStatus enum onto the 4 vendor-facing checkpoints.
 * - ACCEPTED                              → step 0 is current
 * - IN_PREP                               → step 1 is current
 * - READY_PICKUP                          → step 2 is current
 * - PICKED_UP / DELIVERED                 → step 3 is current/reached
 */
function indexFor(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'ACCEPTED':
      return 0;
    case 'IN_PREP':
      return 1;
    case 'READY_PICKUP':
      return 2;
    case 'PICKED_UP':
    case 'DELIVERED':
      return 3;
    default:
      return 0;
  }
}

export function OrderStepper({ status, className }: OrderStepperProps) {
  const current = indexFor(status);

  return (
    <ol
      className={cn('flex items-start justify-between gap-1', className)}
      aria-label="Étapes de la commande"
    >
      {STEPS.map((step, idx) => {
        const reached = idx <= current;
        const isCurrent = idx === current;
        return (
          <li key={step.key} className="relative flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* connector to previous (skipped for first) */}
              {idx > 0 ? (
                <div
                  className={cn(
                    '-ml-1 h-0.5 flex-1 transition-colors',
                    idx <= current ? 'bg-chop-red' : 'bg-divider',
                  )}
                  aria-hidden
                />
              ) : (
                <div className="flex-1" />
              )}
              <span
                className={cn(
                  'relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                  reached
                    ? 'border-chop-red bg-chop-red text-white'
                    : 'border-divider bg-chop-card-white text-muted-foreground',
                  isCurrent && 'ring-4 ring-chop-red/20',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {reached && !isCurrent ? (
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                ) : (
                  idx + 1
                )}
              </span>
              {idx < STEPS.length - 1 ? (
                <div
                  className={cn(
                    '-mr-1 h-0.5 flex-1 transition-colors',
                    idx < current ? 'bg-chop-red' : 'bg-divider',
                  )}
                  aria-hidden
                />
              ) : (
                <div className="flex-1" />
              )}
            </div>
            <span
              className={cn(
                'mt-1.5 text-[11px] font-semibold transition-colors',
                reached ? 'text-chop-ink' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
