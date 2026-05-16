// Site-wide banner shown only during the COD-only Douala micro-zone pilot.
// Toggled by NEXT_PUBLIC_PILOT_COD_ONLY. Sticky at the top of every page; not
// dismissible (the message is operational, not promotional, so it must stay
// visible until pilot ends and the flag is unset).
export function PilotBanner() {
  if (process.env.NEXT_PUBLIC_PILOT_COD_ONLY !== 'true') return null;
  return (
    <div className="sticky top-0 z-50 border-b border-chop-red bg-chop-red px-4 py-2 text-center text-xs font-semibold text-white shadow-sm">
      Bêta · paiement à la livraison uniquement
    </div>
  );
}
