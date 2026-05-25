'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/api-client';
import { cn } from '@/lib/utils';
import type { ItemKind, MenuItem, MenuItemInput, StockLevel } from '../hooks/useMenuItems';
import type { MenuCategory } from '../hooks/useMenuCategories';

type FormValues = {
  name: string;
  description?: string | '';
  priceXAF: number | string;
  preparationMinutes?: number | string | '';
};

export interface MenuItemEditorProps {
  initial?: MenuItem;
  onSave: (input: MenuItemInput) => Promise<MenuItem>;
  onUploadPhoto?: (itemId: string, file: File) => Promise<MenuItem>;
  onClose: () => void;
  /**
   * Categories the vendor can assign this item to. Pass an empty array for
   * INFORMAL vendors (categories are hidden in the menu screen there too).
   */
  categories?: MenuCategory[];
}

/**
 * Story 2.2 / 2.3 + 2.11 — create/edit a menu item. For new items, the photo
 * input only appears after the item exists (the upload endpoint is keyed by
 * itemId). For existing items, the photo can be uploaded before / after edits
 * are saved.
 */
export function MenuItemEditor({
  initial,
  onSave,
  onUploadPhoto,
  onClose,
  categories = [],
}: MenuItemEditorProps) {
  const t = useTranslations('Vendor');
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [currentItem, setCurrentItem] = React.useState<MenuItem | undefined>(initial);
  // kind + stockLevel + categoryId live outside react-hook-form because
  // they're toggles, not text inputs, and we want the immediate-feedback
  // radio UX. categoryId is `null` to mean "Sans catégorie".
  const [kind, setKind] = React.useState<ItemKind>(initial?.kind ?? 'FOOD');
  const [stockLevel, setStockLevel] = React.useState<StockLevel>(initial?.stockLevel ?? 'IN_STOCK');
  const [categoryId, setCategoryId] = React.useState<string | null>(initial?.categoryId ?? null);

  // Built inside the component so the validation messages pick up the
  // current locale.
  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('menuEditorNameMin')).max(80),
        description: z.string().max(500).optional().or(z.literal('')),
        priceXAF: z.coerce
          .number({ invalid_type_error: t('menuEditorPriceInvalid') })
          .int(t('menuEditorPriceInt'))
          .min(100, t('menuEditorPriceMin'))
          .max(1_000_000, t('menuEditorPriceMax')),
        preparationMinutes: z.coerce
          .number({ invalid_type_error: t('menuEditorPrepInvalid') })
          .int()
          .min(1)
          .max(180)
          .optional()
          .or(z.literal('')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      priceXAF: initial?.priceXAF ?? 1000,
      preparationMinutes: initial?.preparationMinutes ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSaving(true);
    try {
      const prep =
        typeof values.preparationMinutes === 'number' ? values.preparationMinutes : undefined;
      const input: MenuItemInput = {
        name: values.name,
        description:
          typeof values.description === 'string' && values.description.length > 0
            ? values.description
            : undefined,
        priceXAF: Number(values.priceXAF),
        preparationMinutes: prep,
        kind,
        stockLevel,
        categoryId: categoryId ?? undefined,
      };
      const saved = await onSave(input);
      setCurrentItem(saved);
      if (!initial) {
        // New item — keep the dialog open so the vendor can upload a photo
        // before closing. They click "Fermer" to dismiss.
      } else {
        onClose();
      }
    } catch (err) {
      setServerError(extractMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentItem || !onUploadPhoto) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const updated = await onUploadPhoto(currentItem.id, file);
      setCurrentItem(updated);
    } catch (err) {
      setPhotoError(extractMessage(err, t));
    } finally {
      setPhotoUploading(false);
      e.target.value = ''; // allow re-select of the same file
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="bg-card max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-xl border p-4 sm:rounded-xl md:max-w-2xl md:p-6">
        <header className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">
            {initial ? t('menuEditorTitleEdit') : t('menuEditorTitleNew')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('menuEditorClose')}
            className="text-2xl leading-none text-muted-foreground"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-semibold">
              {t('menuEditorNameLabel')}
            </label>
            <Input id="name" placeholder={t('menuEditorNamePh')} {...register('name')} />
            {errors.name ? (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-semibold">
              {t('menuEditorDescLabel')}{' '}
              <span className="text-xs text-muted-foreground">{t('menuEditorDescOptional')}</span>
            </label>
            <Input
              id="description"
              placeholder={t('menuEditorDescPh')}
              maxLength={500}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="priceXAF" className="mb-1 block text-sm font-semibold">
                {t('menuEditorPriceLabel')}
              </label>
              <Input
                id="priceXAF"
                type="number"
                inputMode="numeric"
                min={100}
                step={100}
                {...register('priceXAF')}
              />
              {errors.priceXAF ? (
                <p className="mt-1 text-xs text-destructive">{errors.priceXAF.message}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="prep" className="mb-1 block text-sm font-semibold">
                {t('menuEditorPrepLabel')}
              </label>
              <Input
                id="prep"
                type="number"
                inputMode="numeric"
                min={1}
                max={180}
                placeholder={t('menuEditorPrepPh')}
                {...register('preparationMinutes')}
              />
              {errors.preparationMinutes ? (
                <p className="mt-1 text-xs text-destructive">{errors.preparationMinutes.message}</p>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold">{t('menuEditorTypeLabel')}</p>
            <div className="flex gap-2">
              <Pill active={kind === 'FOOD'} onClick={() => setKind('FOOD')}>
                {t('menuEditorTypeFood')}
              </Pill>
              <Pill active={kind === 'DRINK'} onClick={() => setKind('DRINK')}>
                {t('menuEditorTypeDrink')}
              </Pill>
            </div>
          </div>

          {/* MenuCategory selector — only renders when the parent passes
              categories (SEMI_FORMAL + RESTAURANT vendors). INFORMAL passes
              an empty array, so the row stays hidden and items remain
              implicitly uncategorized. */}
          {categories.length > 0 ? (
            <div>
              <p className="mb-1 text-sm font-semibold">{t('menuEditorCategoryLabel')}</p>
              <div className="flex flex-wrap gap-2">
                <Pill active={categoryId === null} onClick={() => setCategoryId(null)}>
                  {t('menuEditorCategoryNone')}
                </Pill>
                {categories.map((c) => (
                  <Pill key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                    {c.name}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-sm font-semibold">{t('menuEditorStockLabel')}</p>
            <div className="flex flex-wrap gap-2">
              <Pill active={stockLevel === 'IN_STOCK'} onClick={() => setStockLevel('IN_STOCK')}>
                {t('menuEditorStockIn')}
              </Pill>
              <Pill active={stockLevel === 'LOW_STOCK'} onClick={() => setStockLevel('LOW_STOCK')}>
                {t('menuEditorStockLow')}
              </Pill>
              <Pill
                active={stockLevel === 'OUT_OF_STOCK'}
                onClick={() => setStockLevel('OUT_OF_STOCK')}
              >
                {t('menuEditorStockOut')}
              </Pill>
            </div>
          </div>

          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

          <Button type="submit" disabled={saving} className="w-full">
            {saving
              ? t('menuEditorSaving')
              : initial
                ? t('menuEditorCtaUpdate')
                : t('menuEditorCtaCreate')}
          </Button>
        </form>

        {currentItem && onUploadPhoto ? (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-sm font-semibold">{t('menuEditorPhotoLabel')}</p>
            {currentItem.photoUrl ? (
              // Vendor admin preview — fluid 100% width; using Next/Image
              // here would require fill-mode + position:relative wrapper
              // for vanishingly small LCP benefit on a vendor-admin
              // surface. Consistent with the rest of /vendor/*.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/r2/${currentItem.photoUrl}`}
                alt={currentItem.name}
                className="mb-2 h-32 w-full rounded-lg border object-cover"
              />
            ) : (
              <p className="mb-2 text-xs text-muted-foreground">{t('menuEditorPhotoNone')}</p>
            )}
            <label
              className={`flex cursor-pointer items-center justify-center rounded-lg border border-dashed p-3 text-sm ${
                photoUploading ? 'opacity-50' : ''
              }`}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={onPhotoFile}
                disabled={photoUploading}
                className="hidden"
              />
              {photoUploading
                ? t('menuEditorPhotoUploading')
                : currentItem.photoUrl
                  ? t('menuEditorPhotoReplace')
                  : t('menuEditorPhotoAdd')}
            </label>
            {photoError ? <p className="mt-1 text-xs text-destructive">{photoError}</p> : null}
          </div>
        ) : null}

        {!initial && currentItem ? (
          <Button type="button" variant="outline" onClick={onClose} className="mt-4 w-full">
            {t('menuEditorCtaCloseDialog')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors',
        active
          ? 'border-chop-ink bg-chop-ink text-white'
          : 'border-divider bg-background text-chop-ink hover:border-chop-ink/40',
      )}
    >
      {children}
    </button>
  );
}

function extractMessage(err: unknown, t: ReturnType<typeof useTranslations<'Vendor'>>): string {
  if (err instanceof ApiClientError) {
    const body = err.body as { code?: string; message?: string } | undefined;
    if (body?.code === 'menu_limit_reached') {
      return t('menuEditorErrMenuLimit');
    }
    return body?.message ?? t('errorPrefix', { status: err.status });
  }
  return (err as Error)?.message ?? t('errorNetwork');
}
