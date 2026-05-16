// Site-wide banner shown only during the COD-only Douala micro-zone pilot.
// Toggled by NEXT_PUBLIC_PILOT_COD_ONLY. Sits at the top of the document
// flow on first paint; scrolls away with content as the user reads. The
// pilot message is informational — it doesn't need to follow the user
// through scroll, and a sticky red bar covering the hero headline as the
// user scrolls is visually noisy. (Removed `sticky top-0 z-50` 2026-05-16.)
export function PilotBanner() {
  if (process.env.NEXT_PUBLIC_PILOT_COD_ONLY !== 'true') return null;
  return (
    <div className="border-b border-chop-red bg-chop-red px-4 py-2 text-center text-xs font-semibold text-white">
      Bêta · paiement à la livraison uniquement
    </div>
  );
}
