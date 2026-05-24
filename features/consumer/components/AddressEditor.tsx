'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import dynamic from 'next/dynamic';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { useGeolocation } from '../hooks/useGeolocation';
import type { SavedAddress } from '@/features/cart/hooks/useAddresses';

// Lazy: dialog only renders on the geo-denied branch, defer its bundle
// from the address-editor's initial chunk.
const GpsHelpDialog = dynamic(
  () => import('./GpsHelpDialog').then((m) => ({ default: m.GpsHelpDialog })),
  { ssr: false },
);

const schema = z.object({
  label: z.string().min(1, 'Donne-lui un nom (ex: Maison)').max(40),
  description: z.string().max(200).optional().or(z.literal('')),
  quartier: z.string().min(2, 'Quartier requis').max(80),
  phone: z
    .string()
    .regex(/^(?:6[5-9]\d{7}|\+?[1-9]\d{7,14})$/, 'Numéro invalide')
    .optional()
    .or(z.literal('')),
  isDefault: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface AddressEditorProps {
  initial?: SavedAddress;
  onSaved: (saved: SavedAddress) => void;
  onCancel: () => void;
}

/**
 * Story 3.2 — create / edit a saved address. The lat/lng come from the
 * browser's geolocation (current position), not user-typed coords —
 * Douala has no formal addresses; the "where" is the landmark + free-form
 * description, and the GPS pin is just an orientation anchor.
 */
export function AddressEditor({ initial, onSaved, onCancel }: AddressEditorProps) {
  const geo = useGeolocation();
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showGpsHelp, setShowGpsHelp] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: initial?.label ?? '',
      description: initial?.description ?? '',
      quartier: initial?.quartier ?? '',
      phone: initial?.phone ?? '',
      isDefault: initial?.isDefault ?? false,
    },
    mode: 'onBlur',
  });

  React.useEffect(() => {
    if (geo.status === 'ready' && !coords) {
      setCoords({ lat: geo.lat, lng: geo.lng });
    }
  }, [geo, coords]);

  const onSubmit = async (values: FormValues) => {
    if (!coords) {
      setError('root', { message: "Active la localisation pour enregistrer l'adresse." });
      return;
    }
    setSaving(true);
    setServerError(null);
    const payload = {
      label: values.label,
      description: values.description || undefined,
      quartier: values.quartier,
      lat: coords.lat,
      lng: coords.lng,
      phone: values.phone || undefined,
      isDefault: values.isDefault ?? false,
    };
    try {
      const saved = initial
        ? await apiRaw.patch<SavedAddress>(`/api/v1/users/me/addresses/${initial.id}`, payload)
        : await apiRaw.post<SavedAddress>('/api/v1/users/me/addresses', payload);
      onSaved(saved);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? ((err.body as { code?: string; message?: string } | undefined)?.message ??
            `Erreur ${err.status}`)
          : (err as Error).message;
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card space-y-4 rounded-lg border p-4">
      <div>
        <label htmlFor="label" className="mb-1 block text-sm font-semibold">
          Nom de l&apos;adresse
        </label>
        <Input id="label" placeholder="Maison, Bureau, Chez Maman…" {...register('label')} />
        {errors.label ? (
          <p className="mt-1 text-xs text-destructive">{errors.label.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="quartier" className="mb-1 block text-sm font-semibold">
          Quartier
        </label>
        <Input
          id="quartier"
          autoComplete="address-level2"
          placeholder="Makepe, Bonamoussadi…"
          {...register('quartier')}
        />
        {errors.quartier ? (
          <p className="mt-1 text-xs text-destructive">{errors.quartier.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-semibold">
          Description précise <span className="text-xs text-muted-foreground">(optionnel)</span>
        </label>
        <Input
          id="description"
          placeholder="2ème portail bleu après la pharmacie, klaxonner"
          maxLength={200}
          {...register('description')}
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-semibold">
          Numéro à appeler{' '}
          <span className="text-xs text-muted-foreground">(si différent du compte)</span>
        </label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="670000000"
          {...register('phone')}
        />
        {errors.phone ? (
          <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('isDefault')} />
        Par défaut au prochain checkout
      </label>

      <div className="rounded border bg-background p-3 text-xs text-muted-foreground">
        {coords ? (
          <>
            📍 Position GPS capturée{' '}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                setCoords(null);
                geo.request();
              }}
            >
              Recapturer
            </button>
          </>
        ) : geo.status === 'requesting' ? (
          <>Capture GPS en cours…</>
        ) : geo.status === 'denied' || geo.status === 'unsupported' ? (
          <>
            ⚠️ {geo.status === 'denied' ? geo.message : 'Géolocalisation non supportée'}.
            <button type="button" className="ml-2 underline" onClick={geo.request}>
              Réessayer
            </button>
            {geo.status === 'denied' ? (
              <button type="button" className="ml-2 underline" onClick={() => setShowGpsHelp(true)}>
                Comment activer ?
              </button>
            ) : null}
          </>
        ) : (
          <button type="button" className="underline" onClick={geo.request}>
            Capturer ma position GPS
          </button>
        )}
      </div>

      {errors.root ? <p className="text-sm text-destructive">{errors.root.message}</p> : null}
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving || !coords} className="flex-1">
          {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
      </div>

      {showGpsHelp ? <GpsHelpDialog onClose={() => setShowGpsHelp(false)} /> : null}
    </form>
  );
}
