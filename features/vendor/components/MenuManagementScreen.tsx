'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMenuItems, type MenuItem, type StockLevel, type ItemKind } from '../hooks/useMenuItems';
import { MenuItemEditor } from './MenuItemEditor';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

type Tab = 'all' | 'food' | 'drink';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: 'Tout' },
  { key: 'food', label: 'Plats' },
  { key: 'drink', label: 'Boissons' },
];

export function MenuManagementScreen() {
  const menu = useMenuItems();
  const [tab, setTab] = React.useState<Tab>('all');
  const [editing, setEditing] = React.useState<
    { kind: 'new' } | { kind: 'edit'; item: MenuItem } | null
  >(null);

  if (menu.status === 'unauthenticated') {
    return (
      <Shell>
        <EmptyState
          title="Connexion requise"
          message="Connecte-toi pour gérer ton menu."
          ctaHref="/login?next=/vendor/menu"
          ctaLabel="Se connecter"
        />
      </Shell>
    );
  }

  if (menu.status === 'idle' || menu.status === 'loading') {
    return (
      <Shell>
        <Header itemCount={null} />
        <CategorySkeleton />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-chop-card-white shadow-card"
            />
          ))}
        </div>
      </Shell>
    );
  }

  if (menu.status === 'error') {
    return (
      <Shell>
        <Header itemCount={null} />
        <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {menu.message}
        </p>
      </Shell>
    );
  }

  const filtered = menu.items.filter((item) =>
    tab === 'all' ? true : tab === 'food' ? item.kind === 'FOOD' : item.kind === 'DRINK',
  );

  return (
    <Shell>
      <Header itemCount={menu.items.length} />
      <CategoryTabs current={tab} onChange={setTab} items={menu.items} />

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-chop-card-white p-5 text-center text-sm text-muted-foreground shadow-card">
          {tab === 'all'
            ? 'Aucun plat. Tape « + Ajouter un plat » pour commencer.'
            : 'Rien dans cette catégorie pour le moment.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <MenuItemCard
                item={item}
                onToggleStock={menu.setInStock}
                onCycleStockLevel={menu.setStockLevel}
                onEdit={() => setEditing({ kind: 'edit', item })}
                onDelete={async () => {
                  if (!window.confirm(`Supprimer « ${item.name} » ?`)) return;
                  try {
                    await menu.deleteItem(item.id);
                  } catch (err) {
                    window.alert(extract(err) ?? 'Suppression échouée');
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        size="lg"
        onClick={() => setEditing({ kind: 'new' })}
        className="mt-6 w-full gap-2 bg-chop-ink text-base shadow-card hover:bg-chop-ink/90"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Ajouter un plat
      </Button>

      {editing ? (
        <MenuItemEditor
          initial={editing.kind === 'edit' ? editing.item : undefined}
          onSave={(input) =>
            editing.kind === 'edit'
              ? menu.updateItem(editing.item.id, input)
              : menu.createItem(input)
          }
          onUploadPhoto={menu.uploadPhoto}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Shell>
  );
}

function Header({ itemCount }: { itemCount: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/vendor"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-chop-card-white text-chop-ink shadow-card transition-colors hover:bg-chop-surface-gray"
        aria-label="Retour au dashboard"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </Link>
      <div className="flex-1">
        <h1 className="text-xl font-extrabold tracking-tight">Mon menu</h1>
      </div>
      {itemCount !== null ? (
        <span className="text-xs font-semibold text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'plat' : 'plats'}
        </span>
      ) : null}
    </div>
  );
}

function CategoryTabs({
  current,
  onChange,
  items,
}: {
  current: Tab;
  onChange: (t: Tab) => void;
  items: MenuItem[];
}) {
  const counts = {
    all: items.length,
    food: items.filter((i) => i.kind === 'FOOD').length,
    drink: items.filter((i) => i.kind === 'DRINK').length,
  };
  return (
    <nav className="mt-5 flex gap-2" aria-label="Filtrer par catégorie">
      {TABS.map((t) => {
        const active = t.key === current;
        const count = counts[t.key];
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 px-3 py-2 text-sm font-bold transition-colors',
              active
                ? 'border-chop-ink bg-chop-ink text-white'
                : 'border-divider bg-chop-card-white text-chop-ink hover:border-chop-ink/40',
            )}
            aria-pressed={active}
          >
            {t.label}
            <span
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
                active ? 'bg-white/20 text-white' : 'bg-chop-surface-gray text-muted-foreground',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function CategorySkeleton() {
  return (
    <div className="mt-5 flex gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-9 flex-1 animate-pulse rounded-full bg-chop-surface-gray" />
      ))}
    </div>
  );
}

function MenuItemCard({
  item,
  onToggleStock,
  onCycleStockLevel,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  onToggleStock: (id: string, inStock: boolean) => Promise<void>;
  onCycleStockLevel: (id: string, level: StockLevel) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const sellable = item.stockLevel !== 'OUT_OF_STOCK';

  return (
    <article
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-chop-card-white p-3 shadow-card transition-opacity',
        item.stockLevel === 'OUT_OF_STOCK' && 'opacity-60',
      )}
    >
      <PhotoThumb item={item} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{item.name}</p>
        <p className="mt-0.5 text-sm font-extrabold text-chop-red">{formatXAF(item.priceXAF)}</p>
        <StockBadge level={item.stockLevel} onCycle={(next) => onCycleStockLevel(item.id, next)} />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <Switch checked={sellable} onChange={(next) => onToggleStock(item.id, next)} />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Modifier"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-divider bg-background text-muted-foreground transition-colors hover:border-chop-red/40 hover:text-chop-red"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Supprimer"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-divider bg-background text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function PhotoThumb({ item }: { item: MenuItem }) {
  if (!item.photoUrl) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-chop-surface-gray text-lg">
        {item.kind === 'DRINK' ? '🥤' : '🍽️'}
      </div>
    );
  }
  return (
    <img
      src={`/r2/${item.photoUrl}`}
      alt={item.name}
      className="h-14 w-14 shrink-0 rounded-xl object-cover"
    />
  );
}

function StockBadge({
  level,
  onCycle,
}: {
  level: StockLevel;
  onCycle: (next: StockLevel) => Promise<void>;
}) {
  // Tap-to-cycle through IN_STOCK → LOW_STOCK → IN_STOCK (toggling between
  // the two ON states). Going OUT_OF_STOCK is done via the iOS switch.
  // This separation prevents a thumb tap from accidentally turning off a
  // bestseller while just trying to flag it as "running low".
  const cycle = () => {
    if (level === 'OUT_OF_STOCK') return; // nothing to cycle; switch ON first
    onCycle(level === 'IN_STOCK' ? 'LOW_STOCK' : 'IN_STOCK');
  };

  if (level === 'OUT_OF_STOCK') {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-chop-danger-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-chop-danger">
        ⛔ Rupture
      </span>
    );
  }
  if (level === 'LOW_STOCK') {
    return (
      <button
        type="button"
        onClick={cycle}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 hover:bg-amber-200"
      >
        <AlertTriangle className="h-3 w-3" aria-hidden />
        Stock faible
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={cycle}
      className="mt-1 inline-flex items-center gap-1 rounded-full bg-chop-mboue-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-chop-mboue hover:bg-chop-mboue/15"
    >
      ✓ En stock
    </button>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => void onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-chop-mboue' : 'bg-chop-neutral',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  // Full-screen takeover like /vendor/commande and /vendor/preparation.
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-chop-surface-gray">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-12 pt-5">
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  message: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="mt-20 flex flex-col items-center text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>
      <Button asChild className="mt-5">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}

function extract(err: unknown): string | null {
  const e = err as { body?: { message?: string }; message?: string };
  return e?.body?.message ?? e?.message ?? null;
}
