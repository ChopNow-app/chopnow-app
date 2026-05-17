'use client';

// React 19's react-hooks/set-state-in-effect bites the blob-URL preview
// pattern in PhotoPicker. Same precedent as features/consumer/hooks/useCatalogue.ts.
/* eslint-disable react-hooks/set-state-in-effect */

/**
 * Form atoms shared across onboarding + vendor self-service surfaces.
 *
 * History: these started inline in
 *   features/vendor-onboarding/components/VendorOnboardingForm.tsx
 * (the 5-screen /vendre flow) and were copy-pasted nowhere. Once the
 * /vendor/hours and /vendor/profile editors landed, the same FormSection /
 * Field / BrandInput / RadioCard / PhotoPicker pattern was needed in three
 * places — extracted here as the single source of truth.
 *
 * Style is locked to Sugar Art (Chop Red + Warm + Ink), so the atoms
 * intentionally don't take theming props. If a future surface needs a
 * different palette, branch the atom, don't add an option flag.
 */

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Mirrors backend limit. Exported so callers can compute readable error copy. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

export function FormSection({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-chop-card-white p-5 shadow-card md:p-7">
      <header className="mb-5">
        <span className="font-mono text-[11px] font-bold tabular-nums tracking-widest text-chop-red">
          {num}.
        </span>
        <h2 className="mt-0.5 text-[20px] font-extrabold tracking-tight text-chop-ink md:text-[22px]">
          {title}
        </h2>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-bold text-chop-ink">
        {label}
        {hint ? <span className="ml-1.5 font-medium text-chop-ink-secondary">· {hint}</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-chop-danger">{error}</p> : null}
    </div>
  );
}

export const BrandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      'h-11 rounded-xl border-divider bg-chop-warm text-[15px] focus-visible:border-chop-red focus-visible:ring-2 focus-visible:ring-chop-red/20',
      className,
    )}
    {...props}
  />
));
BrandInput.displayName = 'BrandInput';

export const RadioCard = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; sub?: string }
>(({ label, sub, ...props }, ref) => (
  <label className="group block cursor-pointer">
    <input ref={ref} type="radio" className="peer sr-only" {...props} />
    <div className="flex items-start gap-3 rounded-xl border-2 border-divider bg-chop-warm p-3.5 transition-all peer-checked:border-chop-red peer-checked:bg-chop-red-light peer-checked:shadow-card">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-divider transition-all peer-checked:border-chop-red">
        <span
          aria-hidden
          className="hidden h-2.5 w-2.5 rounded-full bg-chop-red group-[:has(:checked)]:block peer-checked:block"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-chop-ink">{label}</p>
        {sub ? (
          <p className="mt-0.5 text-[12px] font-medium text-chop-ink-secondary">{sub}</p>
        ) : null}
      </div>
    </div>
  </label>
));
RadioCard.displayName = 'RadioCard';

export function PhotoPicker({
  label,
  hint,
  helperText,
  file,
  onPick,
  required,
}: {
  label: string;
  hint?: string;
  helperText?: string;
  file: File | null;
  onPick: (f: File | null) => void;
  required?: boolean;
}) {
  const inputId = React.useId();
  const [preview, setPreview] = React.useState<string | null>(null);

  // Generate (and revoke) a blob URL for the live preview thumbnail. This
  // makes the "did my photo upload?" feedback immediate — the old UI showed
  // only the filename, which made the picker feel like a placeholder.
  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onSelect = (next: File | null) => {
    if (next && next.size > MAX_PHOTO_BYTES) {
      onPick(null);
      window.alert(`Photo trop lourde (${(next.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.`);
      return;
    }
    onPick(next);
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-bold text-chop-ink">
        {label}
        {required ? <span className="ml-1 text-chop-red">*</span> : null}
        {hint ? <span className="ml-1.5 font-medium text-chop-ink-secondary">· {hint}</span> : null}
      </label>

      {file && preview ? (
        // Live preview with file metadata + remove action — makes upload
        // feel concrete, not placeholder-y.
        <div className="relative overflow-hidden rounded-2xl border-2 border-chop-mboue/40 shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="aspect-[16/10] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/50 to-transparent px-3 py-2.5 text-[12px] font-medium text-white">
            <span className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden>✓</span>
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 opacity-70">· {(file.size / 1024).toFixed(0)} KB</span>
            </span>
            <button
              type="button"
              onClick={() => onPick(null)}
              className="shrink-0 text-white underline-offset-2 hover:underline"
            >
              Changer
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-divider bg-chop-warm py-7 text-center transition-colors hover:border-chop-red/50 hover:bg-chop-red-light/30"
        >
          <span aria-hidden className="text-3xl">
            📸
          </span>
          <span className="text-[14px] font-semibold text-chop-ink">Touche pour photographier</span>
          <span className="text-[11px] font-medium text-chop-ink-secondary">
            JPG, PNG, HEIC · max 8 MB
          </span>
        </label>
      )}

      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      {helperText ? (
        <p className="mt-1.5 text-[12px] font-medium text-chop-ink-secondary">{helperText}</p>
      ) : null}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border-l-4 border-chop-danger bg-chop-danger-light px-4 py-3 text-[13px] font-medium text-chop-danger">
      {message}
    </div>
  );
}
