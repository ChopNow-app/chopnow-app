'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMenuItems, type MenuItem, type StockLevel, type ItemKind } from '../hooks/useMenuItems';
import { useMenuCategories, type MenuCategory } from '../hooks/useMenuCategories';
import { useVendorProfile } from '../hooks/useVendorProfile';
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
  const profile = useVendorProfile();
  const cats = useMenuCategories();
  const [tab, setTab] = React.useState<Tab>('all');
  // SEMI_FORMAL + RESTAURANT vendors get a category strip. `selectedCategoryId`
  // tracks which category bucket is active; null === "Tout".
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<
    { kind: 'new' } | { kind: 'edit'; item: MenuItem } | null
  >(null);

  // Type-awareness: INFORMAL keeps the kind tabs view. SEMI_FORMAL + RESTAURANT
  // get category grouping. We render the kind-tabs branch by default while
  // the profile loads (no flicker into category UI for an INFORMAL vendor on
  // a slow connection).
  const vendorType = profile.status === 'ready' ? profile.data.type : 'INFORMAL';
  const useCategories = vendorType !== 'INFORMAL';

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

  if (menu.status === 'loading') {
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

  // For non-informal: filter by selectedCategoryId. For informal: filter by kind tab.
  const categoriesList = cats.status === 'ready' ? cats.categories : [];
  const filtered = useCategories
    ? selectedCategoryId === null
      ? menu.items
      : menu.items.filter((i) => i.categoryId === selectedCategoryId)
    : menu.items.filter((item) =>
        tab === 'all' ? true : tab === 'food' ? item.kind === 'FOOD' : item.kind === 'DRINK',
      );

  const handleCreateCategory = async () => {
    const name = window.prompt('Nom de la catégorie ?');
    if (!name || name.trim().length < 2) return;
    try {
      await cats.createCategory(name.trim());
    } catch (err) {
      window.alert(extract(err) ?? 'Création échouée');
    }
  };

  return (
    <Shell>
      <Header itemCount={menu.items.length} />

      {useCategories ? (
        <CategoryStrip
          categories={categoriesList}
          items={menu.items}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          onCreate={handleCreateCategory}
        />
      ) : (
        <CategoryTabs current={tab} onChange={setTab} items={menu.items} />
      )}

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-chop-card-white p-5 text-center text-sm text-muted-foreground shadow-card">
          {menu.items.length === 0
            ? 'Aucun plat. Tape « + Ajouter un plat » pour commencer.'
            : 'Rien dans cette catégorie pour le moment.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <MenuItemCard
                item={item}
                categoryName={
                  useCategories
                    ? (categoriesList.find((c) => c.id === item.categoryId)?.name ?? null)
                    : null
                }
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
          categories={useCategories ? categoriesList : []}
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

/**
 * Horizontal scrollable category strip for SEMI_FORMAL + RESTAURANT vendors.
 * "Tout" pill resets the filter; "+ Nouvelle catégorie" pill triggers a
 * one-shot prompt that POSTs to /vendors/me/categories. Categories overflow
 * to horizontal scroll on mobile rather than wrapping — keeps the rest of
 * the menu visible.
 */
function CategoryStrip({
  categories,
  items,
  selectedId,
  onSelect,
  onCreate,
}: {
  categories: MenuCategory[];
  items: MenuItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
}) {
  // Count items in each category for the badge — helps the vendor see at
  // a glance which sections are sparse.
  const counts = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const item of items) {
      if (item.categoryId) {
        out[item.categoryId] = (out[item.categoryId] ?? 0) + 1;
      }
    }
    return out;
  }, [items]);
  return (
    <nav
      className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Filtrer par catégorie"
    >
      <CategoryPill active={selectedId === null} onClick={() => onSelect(null)}>
        Tout
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
            selectedId === null
              ? 'bg-white/20 text-white'
              : 'bg-chop-surface-gray text-muted-foreground',
          )}
        >
          {items.length}
        </span>
      </CategoryPill>
      {categories.map((c) => (
        <CategoryPill key={c.id} active={selectedId === c.id} onClick={() => onSelect(c.id)}>
          {c.name}
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
              selectedId === c.id
                ? 'bg-white/20 text-white'
                : 'bg-chop-surface-gray text-muted-foreground',
            )}
          >
            {counts[c.id] ?? 0}
          </span>
        </CategoryPill>
      ))}
      <button
        type="button"
        onClick={onCreate}
        className="flex shrink-0 items-center gap-1 rounded-full border-2 border-dashed border-divider bg-chop-card-white px-3 py-2 text-xs font-bold text-chop-red transition-colors hover:border-chop-red hover:bg-chop-red-light"
      >
        <Plus className="h-3 w-3" aria-hidden />
        Nouvelle
      </button>
    </nav>
  );
}

function CategoryPill({
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
        'flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-2 text-sm font-bold transition-colors',
        active
          ? 'border-chop-ink bg-chop-ink text-white'
          : 'border-divider bg-chop-card-white text-chop-ink hover:border-chop-ink/40',
      )}
    >
      {children}
    </button>
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
  categoryName,
  onToggleStock,
  onCycleStockLevel,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  categoryName: string | null;
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
        {categoryName ? (
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
            {categoryName}
          </p>
        ) : null}
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
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-12 pt-5 md:max-w-3xl md:px-8">
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
