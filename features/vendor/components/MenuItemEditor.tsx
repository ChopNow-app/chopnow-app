'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/api-client';
import { cn } from '@/lib/utils';
import type { ItemKind, MenuItem, MenuItemInput, StockLevel } from '../hooks/useMenuItems';
import type { MenuCategory } from '../hooks/useMenuCategories';

const schema = z.object({
  name: z.string().min(2, '2 caractères minimum').max(80),
  description: z.string().max(500).optional().or(z.literal('')),
  priceXAF: z.coerce
    .number({ invalid_type_error: 'Prix invalide' })
    .int('Entier requis')
    .min(100, 'Minimum 100 FCFA')
    .max(1_000_000, 'Maximum 1 000 000 FCFA'),
  preparationMinutes: z.coerce
    .number({ invalid_type_error: 'Nombre invalide' })
    .int()
    .min(1)
    .max(180)
    .optional()
    .or(z.literal('')),
});

type FormValues = z.input<typeof schema>;

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
      setServerError(extractMessage(err));
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
      setPhotoError(extractMessage(err));
    } finally {
      setPhotoUploading(false);
      e.target.value = ''; // allow re-select of the same file
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="bg-card max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-xl border p-4 sm:rounded-xl md:max-w-2xl md:p-6">
        <header className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{initial ? 'Modifier le plat' : 'Nouveau plat'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-2xl leading-none text-muted-foreground"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-semibold">
              Nom du plat
            </label>
            <Input id="name" placeholder="Poulet DG" {...register('name')} />
            {errors.name ? (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-semibold">
              Description <span className="text-xs text-muted-foreground">(optionnel)</span>
            </label>
            <Input
              id="description"
              placeholder="Poulet rôti, plantains, légumes"
              maxLength={500}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="priceXAF" className="mb-1 block text-sm font-semibold">
                Prix (FCFA)
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
                Préparation (min)
              </label>
              <Input
                id="prep"
                type="number"
                inputMode="numeric"
                min={1}
                max={180}
                placeholder="20"
                {...register('preparationMinutes')}
              />
              {errors.preparationMinutes ? (
                <p className="mt-1 text-xs text-destructive">{errors.preparationMinutes.message}</p>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold">Type</p>
            <div className="flex gap-2">
              <Pill active={kind === 'FOOD'} onClick={() => setKind('FOOD')}>
                🍽️ Plat
              </Pill>
              <Pill active={kind === 'DRINK'} onClick={() => setKind('DRINK')}>
                🥤 Boisson
              </Pill>
            </div>
          </div>

          {/* MenuCategory selector — only renders when the parent passes
              categories (SEMI_FORMAL + RESTAURANT vendors). INFORMAL passes
              an empty array, so the row stays hidden and items remain
              implicitly uncategorized. */}
          {categories.length > 0 ? (
            <div>
              <p className="mb-1 text-sm font-semibold">Catégorie du menu</p>
              <div className="flex flex-wrap gap-2">
                <Pill active={categoryId === null} onClick={() => setCategoryId(null)}>
                  Sans catégorie
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
            <p className="mb-1 text-sm font-semibold">Stock</p>
            <div className="flex flex-wrap gap-2">
              <Pill active={stockLevel === 'IN_STOCK'} onClick={() => setStockLevel('IN_STOCK')}>
                ✓ En stock
              </Pill>
              <Pill active={stockLevel === 'LOW_STOCK'} onClick={() => setStockLevel('LOW_STOCK')}>
                ⚠️ Stock faible
              </Pill>
              <Pill
                active={stockLevel === 'OUT_OF_STOCK'}
                onClick={() => setStockLevel('OUT_OF_STOCK')}
              >
                ⛔ Rupture
              </Pill>
            </div>
          </div>

          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer'}
          </Button>
        </form>

        {currentItem && onUploadPhoto ? (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-sm font-semibold">Photo du plat</p>
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
              <p className="mb-2 text-xs text-muted-foreground">
                Aucune photo — les plats avec photo se vendent mieux.
              </p>
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
                ? 'Upload en cours…'
                : currentItem.photoUrl
                  ? '📸 Remplacer la photo'
                  : '📸 Ajouter une photo'}
            </label>
            {photoError ? <p className="mt-1 text-xs text-destructive">{photoError}</p> : null}
          </div>
        ) : null}

        {!initial && currentItem ? (
          <Button type="button" variant="outline" onClick={onClose} className="mt-4 w-full">
            Fermer
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

function extractMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    const body = err.body as { code?: string; message?: string } | undefined;
    if (body?.code === 'menu_limit_reached') {
      return "Limite atteinte (15 plats pour les vendeurs informels). Supprime un plat avant d'en ajouter un autre.";
    }
    return body?.message ?? `Erreur ${err.status}`;
  }
  return (err as Error)?.message ?? 'Erreur réseau';
}
