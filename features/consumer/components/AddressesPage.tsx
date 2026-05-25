'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { AuthRequired } from '@/components/ui/auth-required';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAddresses, type SavedAddress } from '@/features/cart/hooks/useAddresses';
import { toast } from '@/hooks/use-toast';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { AddressEditor } from './AddressEditor';

/**
 * Story 3.2 — saved-addresses CRUD. Max 3 per user (server-enforced;
 * surfaced as `address_limit_reached`).
 */
export function AddressesPage() {
  const t = useTranslations('Addresses');
  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('AuthRequired');
  const { reload, ...state } = useAddresses();
  const [editing, setEditing] = React.useState<SavedAddress | null>(null);
  const [creating, setCreating] = React.useState(false);
  // The address pending deletion (drives the confirm dialog). null = no
  // dialog open. Carries the SavedAddress (not just id) so we can echo
  // the label back to the user in the confirm copy.
  const [pendingDelete, setPendingDelete] = React.useState<SavedAddress | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  if (state.status === 'unauthenticated') {
    return (
      <AuthRequired
        theme="light"
        subtitle={tAuth('subtitleAddresses')}
        loginHref="/login?next=/account/addresses"
        features={[
          { icon: '📍', label: tAuth('addressesFeature1') },
          { icon: '⚡', label: tAuth('addressesFeature2') },
          { icon: '🚲', label: tAuth('addressesFeature3') },
        ]}
        reassurance={tAuth('reassurance')}
      />
    );
  }

  const addresses = state.status === 'ready' ? state.addresses : [];
  const canAdd = addresses.length < 3;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiRaw.delete(`/api/v1/users/me/addresses/${pendingDelete.id}`);
      reload();
      toast({ variant: 'success', title: t('deleteSuccess') });
      setPendingDelete(null);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? tCommon('errorPrefix', { status: err.status })
          : (err as Error).message;
      toast({ variant: 'error', title: t('deleteFailed'), description: msg });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-chop-warm pb-16 text-chop-ink">
      <header className="container py-4">
        <Link href="/restaurants" className="text-sm text-muted-foreground">
          {t('backRestaurants')}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('countLine', { count: addresses.length })}
        </p>
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
            title={t('emptyTitle')}
            body={t('emptyBody')}
            cta={{ label: t('addCta'), onClick: () => setCreating(true) }}
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
                    onDelete={() => setPendingDelete(addr)}
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
            {canAdd ? t('addCtaPlus') : t('limitReached')}
          </Button>
        )}
      </section>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t('deleteConfirmTitle')}
        description={
          pendingDelete
            ? t('deleteConfirmBody', {
                label: pendingDelete.label ?? pendingDelete.quartier ?? t('addressLabel'),
              })
            : undefined
        }
        confirmLabel={tCommon('delete')}
        onConfirm={confirmDelete}
        busy={deleting}
      />
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
  const t = useTranslations('Addresses');
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {addr.label ?? t('addressLabel')}
            {addr.isDefault ? (
              <span className="ml-2 rounded-full bg-chop-red/20 px-2 py-0.5 text-xs">
                {t('defaultBadge')}
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
          {t('edit')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDelete}>
          {t('delete')}
        </Button>
      </div>
    </div>
  );
}
