// Site-wide pilot beta banner. Toggled by NEXT_PUBLIC_PILOT_BANNER so we
// can dismiss it post-pilot without a code change. The pilot launches
// MoMo-only via MTN MoMo + Orange Money — no cash-on-delivery — so the
// copy reflects that. Sits in the document flow on first paint; scrolls
// away with content (no sticky bar covering the hero).
export function PilotBanner() {
  if (process.env.NEXT_PUBLIC_PILOT_BANNER !== 'true') return null;
  return (
    <div className="border-b border-chop-red bg-chop-red px-4 py-2 text-center text-xs font-semibold text-white">
      Bêta · pilote micro-zone à Douala
    </div>
  );
}
