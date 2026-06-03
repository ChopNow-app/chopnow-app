import { ImageResponse } from 'next/og';

// Branded Open Graph image — rendered to PNG by Next.js's edge image
// generation (uses Satori + Resvg under the hood). Served at
// /opengraph-image.png and auto-attached to OG/Twitter meta tags by the
// Next Metadata API on every page that doesn't override it.
//
// Why dynamic instead of a static PNG: keeps the brand mark + tagline
// editable in code (one source of truth with the design tokens) and
// avoids checking a 100 KB binary into git. Re-renders on each deploy
// since Vercel invalidates the OG cache when /app changes.

export const alt = 'Tchop NoW — Mange sans attendre';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand tokens (kept literal — Satori doesn't read Tailwind config)
const CHOP_RED = '#E11D2A';
const CHOP_INK = '#0F0F0F';
const CHOP_WARM = '#FAF8F5';

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: CHOP_WARM,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 88px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: CHOP_RED,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 36,
            fontWeight: 900,
          }}
        >
          T
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: CHOP_INK, letterSpacing: -0.5 }}>
            Tchop NoW
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: CHOP_RED,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Douala · Cameroun
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: CHOP_INK,
            lineHeight: 1,
            letterSpacing: -3,
            textTransform: 'uppercase',
          }}
        >
          Mange sans attendre.
        </div>
        <div style={{ fontSize: 36, fontWeight: 500, color: CHOP_INK, opacity: 0.7 }}>
          De la rue à ta porte.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `2px solid ${CHOP_INK}`,
          paddingTop: 24,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: CHOP_INK }}>app.tchopnow.app</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: 'white',
            background: CHOP_INK,
            padding: '10px 24px',
            borderRadius: 999,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
          }}
        >
          Livraison MoMo
        </div>
      </div>
    </div>,
    { ...size },
  );
}
