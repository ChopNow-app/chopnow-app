'use client';

// Alert dialog — branded replacement for window.confirm() on destructive
// actions (cancel order, delete address, logout). Built on Radix Dialog
// (already a dep via Sheet) rather than @radix-ui/react-alert-dialog so
// we don't ship a second dialog primitive. We set role="alertdialog"
// manually on the content to give it the right ARIA semantics —
// screen readers announce it as an alert + the modal traps focus.
//
// Differs from Sheet:
//   - Centered modal, not slide-in (right tool for must-decide-now prompts)
//   - 2 actions side-by-side: outline Cancel + filled (destructive variant)
//     Confirm, with Cancel on the left so accidental tap of the dominant
//     side is less destructive
//   - Auto-closes on confirm/cancel via controlled open prop

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'destructive',
  onConfirm,
  busy = false,
}: AlertDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    if (!busy) onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          role="alertdialog"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-3xl bg-chop-card-white p-6 text-chop-ink shadow-modal',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <DialogPrimitive.Title className="text-lg font-extrabold tracking-tight">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-sm text-chop-ink-secondary">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          <div className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              className="flex-1"
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy ? '…' : confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
