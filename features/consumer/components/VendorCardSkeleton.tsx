// Layout-matched skeleton for VendorCard. Mirrors the real card's
// rounded-3xl shell + 16:9 hero block + tight metadata rows so the
// transition from loading → loaded is geometrically continuous
// (no layout shift, no perceived "swap"). Used by CataloguePage during
// the initial catalogue fetch.
//
// The animate-pulse comes from `tailwindcss-animate`. We keep the
// surface colours soft (chop-surface-gray, chop-card-white) so the
// pulse reads as ambient progress rather than as missing content.
export function VendorCardSkeleton() {
  return (
    <div
      aria-hidden
      className="relative overflow-hidden rounded-3xl bg-chop-card-white shadow-card"
    >
      {/* hero block — same 16:9 ratio as the real card */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-chop-surface-gray">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-chop-surface-gray via-chop-card-white to-chop-surface-gray" />
        {/* open/closed stamp placeholder — top-left */}
        <div className="absolute left-3 top-3 h-5 w-16 animate-pulse rounded-full bg-chop-card-white/95" />
        {/* quartier chip placeholder — top-right */}
        <div className="absolute right-3 top-3 h-5 w-20 animate-pulse rounded-full bg-chop-ink/30" />
      </div>

      {/* metadata block — three rows: name+price, badge, meta dots */}
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="h-[17px] w-3/5 animate-pulse rounded bg-chop-surface-gray" />
          <div className="h-[13px] w-16 animate-pulse rounded bg-chop-surface-gray" />
        </div>
        <div className="mt-1.5 h-[12px] w-2/5 animate-pulse rounded bg-chop-surface-gray" />
        <div className="mt-3 flex items-center gap-3">
          <div className="h-[12px] w-14 animate-pulse rounded bg-chop-surface-gray" />
          <div className="h-1 w-1 rounded-full bg-divider" />
          <div className="h-[12px] w-12 animate-pulse rounded bg-chop-surface-gray" />
        </div>
      </div>
    </div>
  );
}
