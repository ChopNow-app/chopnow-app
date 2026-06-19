'use client';

// setDraft inside useEffect is intentional: we sync draft from committed
// filters whenever the sheet opens so Cancel always discards in-progress changes.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export interface FilterState {
  openNow: boolean;
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (next: FilterState) => void;
}

export function FilterSheet({ open, onClose, filters, onApply }: FilterSheetProps) {
  const t = useTranslations('Consumer');
  const tCommon = useTranslations('Common');
  const [draft, setDraft] = React.useState<FilterState>(filters);

  React.useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  function handleApply() {
    onApply(draft);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-chop-card-white p-0">
        {/* Drag handle */}
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-chop-surface-gray" />
        </div>

        <SheetHeader className="border-b border-divider px-6 pb-5 pt-2 text-left">
          <SheetTitle className="text-[18px] font-extrabold tracking-tight text-chop-ink">
            {tCommon('filters')}
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 py-5">
          <button
            type="button"
            onClick={() => setDraft((prev) => ({ ...prev, openNow: !prev.openNow }))}
            aria-pressed={draft.openNow}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 transition-all active:scale-[0.99]',
              draft.openNow
                ? 'border-chop-ink bg-chop-ink text-white'
                : 'border-divider bg-transparent text-chop-ink hover:border-chop-ink/30',
            )}
          >
            <span className="text-[15px] font-semibold">{t('filterOpenNow')}</span>
            {/* Toggle pill — visual only, aria-pressed on the parent button carries the state */}
            <span
              aria-hidden
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                draft.openNow ? 'bg-chop-red' : 'bg-chop-surface-gray',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  draft.openNow ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </span>
          </button>
        </div>

        <div className="flex gap-3 px-6 pb-8">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            {tCommon('apply')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
