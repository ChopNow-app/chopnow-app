'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

/**
 * Global toast container. Mounted once in app/layout.tsx so any component
 * (server or client) can call `toast(...)` from `@/hooks/use-toast`.
 *
 * The variant maps to a brand color + an icon:
 *   - success → mboué (validated green) + CheckCircle2
 *   - error → danger (red) + AlertCircle
 *   - default → neutral card-white (used for "info" / generic feedback)
 *
 * Viewport positioning is responsive (bottom-center on mobile above the
 * 64px bottom nav + safe-area-inset, top-right on md+). Defined in
 * components/ui/toast.tsx ToastViewport.
 */
export function Toaster() {
  const { toasts } = useToast();
  return (
    // `label` is read by Radix to (a) name the toast region in the
    // accessibility tree (replaces the default English "Notifications")
    // and (b) announce the F8 hotkey to screen readers when a toast
    // appears. Setting it in French keeps the announcement consistent
    // with the rest of the UI.
    <ToastProvider swipeDirection="right" label="Notifications Tchop NoW">
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <Icon variant={variant} />
          <div className="flex-1">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? <ToastDescription>{description}</ToastDescription> : null}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

function Icon({ variant }: { variant?: 'default' | 'success' | 'error' | null }) {
  if (variant === 'success') {
    return <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />;
  }
  if (variant === 'error') {
    return <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />;
  }
  return null;
}
