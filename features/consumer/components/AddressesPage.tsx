'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { useAddresses, type SavedAddress } from '@/features/cart/hooks/useAddresses';
import { AddressEditor } from './AddressEditor';

/**
 * Story 3.2 — saved-addresses CRUD. Max 3 per user (server-enforced;
 * surfaced as `address_limit_reached`).
 */
export function AddressesPage() {
  const { reload, ...state } = useAddresses();
  const [editing, setEditing] = React.useState<SavedAddress | null>(null);
  const [creating, setCreating] = React.useState(false);

  if (state.status === 'unauthenticated') {
    return (
      <main className="container max-w-md py-16 text-center">
        <h1 className="text-xl font-bold">Connexion requise</h1>
        <Button asChild className="mt-6">
          <Link href="/login?next=/account/addresses">Se connecter</Link>
        </Button>
      </main>
    );
  }

  const addresses = state.status === 'ready' ? state.addresses : [];
  const canAdd = addresses.length < 3;

  const onDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette adresse ?')) return;
    try {
      await apiRaw.delete(`/api/v1/users/me/addresses/${id}`);
      reload();
    } catch (err) {
      const msg = err instanceof ApiClientError ? `Erreur ${err.status}` : (err as Error).message;
      window.alert(msg);
    }
  };

  return (
    <main className="min-h-dvh bg-chop-warm pb-16 text-chop-ink">
      <header className="container py-4">
        <Link href="/restaurants" className="text-sm text-muted-foreground">
          ← Restaurants
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">Mes adresses</h1>
        <p className="text-sm text-muted-foreground">{addresses.length} / 3 enregistrée(s).</p>
      </header>

      <section className="container space-y-3 py-2">
        {state.status === 'loading' ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border bg-background" />
            ))}
          </div>
        ) : state.status === 'error' ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {state.message}
          </p>
        ) : addresses.length === 0 && !creating ? (
          <EmptyState
            icon="📍"
            title="Aucune adresse enregistrée"
            body="Ajoute une adresse pour passer ta première commande — on s'en souviendra pour les prochaines fois."
            cta={{ label: 'Ajouter une adresse', onClick: () => setCreating(true) }}
          />
        ) : (
          <ul className="space-y-3">
            {addresses.map((addr) => (
              <li key={addr.id}>
                {editing?.id === addr.id ? (
                  <AddressEditor
                    initial={addr}
                    onSaved={() => {
                      setEditing(null);
                      reload();
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <AddressCard
                    addr={addr}
                    onEdit={() => setEditing(addr)}
                    onDelete={() => onDelete(addr.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {creating ? (
          <AddressEditor
            onSaved={() => {
              setCreating(false);
              reload();
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <Button
            type="button"
            disabled={!canAdd}
            onClick={() => setCreating(true)}
            className="w-full"
          >
            {canAdd ? '+ Ajouter une adresse' : 'Limite atteinte (3 max)'}
          </Button>
        )}
      </section>
    </main>
  );
}

function AddressCard({
  addr,
  onEdit,
  onDelete,
}: {
  addr: SavedAddress;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {addr.label ?? 'Adresse'}
            {addr.isDefault ? (
              <span className="ml-2 rounded-full bg-chop-red/20 px-2 py-0.5 text-xs">
                par défaut
              </span>
            ) : null}
          </p>
          {addr.quartier ? (
            <p className="text-sm text-muted-foreground">📍 {addr.quartier}</p>
          ) : null}
          {addr.description ? (
            <p className="mt-1 text-xs text-muted-foreground">{addr.description}</p>
          ) : null}
          {addr.phone ? (
            <p className="mt-1 text-xs text-muted-foreground">📱 {addr.phone}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          Modifier
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDelete}>
          Supprimer
        </Button>
      </div>
    </div>
  );
}
