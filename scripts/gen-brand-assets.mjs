// One-shot brand asset generator (run from chopnow-app/).
// Renders the new TchopNow figure mark into the PWA icon set + iOS splash set.
//   - App icons:  color mark (black figures + red bowl) on a WHITE maskable tile
//   - Splash:     white mark centered on the red (#E11D2A) brand background,
//                 matching manifest.json background_color + launch/page.tsx
// Tooling: sharp (already a dep). favicon.ico is produced separately by Pillow.
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const PUB = path.resolve('public');
const RED = { r: 0xe1, g: 0x1d, b: 0x2a, alpha: 1 }; // #E11D2A — manifest theme/bg
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const colorSvg = await readFile(path.join(PUB, 'brand-icon.svg'));
const whiteSvg = await readFile(path.join(PUB, 'brand-icon-white.svg'));

// Mark aspect ratio from icone 2.svg viewBox (172.57 x 221.15) → height-bound.
const MARK_AR = 172.57 / 221.15;

// Render an SVG buffer to a PNG buffer at a given target HEIGHT (px), width auto.
async function renderMark(svg, heightPx) {
  const w = Math.round(heightPx * MARK_AR);
  return sharp(svg, { density: 384 })
    .resize(w, Math.round(heightPx), { fit: 'fill' })
    .png()
    .toBuffer();
}

// ── App icons: color mark on white tile, ~74% of canvas (maskable safe zone) ──
async function genIcon(size) {
  const markH = Math.round(size * 0.74);
  const mark = await renderMark(colorSvg, markH);
  const meta = await sharp(mark).metadata();
  const out = path.join(PUB, 'icons', `icon-${size}.png`);
  await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([
      {
        input: mark,
        top: Math.round((size - meta.height) / 2),
        left: Math.round((size - meta.width) / 2),
      },
    ])
    .png()
    .toFile(out);
  return out;
}

// ── Splash: white mark centered on red, mark height ~32% of the SHORT side ──
async function genSplash(w, h, file) {
  const markH = Math.round(Math.min(w, h) * 0.32);
  const mark = await renderMark(whiteSvg, markH);
  const meta = await sharp(mark).metadata();
  const out = path.join(PUB, 'icons', 'splash', file);
  await sharp({
    create: { width: w, height: h, channels: 4, background: RED },
  })
    .composite([
      {
        input: mark,
        top: Math.round((h - meta.height) / 2),
        left: Math.round((w - meta.width) / 2),
      },
    ])
    .png({ quality: 90 })
    .toFile(out);
  return out;
}

// favicon source PNGs (color on white) for Pillow to bundle into .ico
async function genFaviconSrc(size) {
  const out = path.join(PUB, `__favicon-${size}.png`);
  await genIconTo(size, out);
  return out;
}
async function genIconTo(size, out) {
  const markH = Math.round(size * 0.82); // tighter for tiny favicon legibility
  const mark = await renderMark(colorSvg, markH);
  const meta = await sharp(mark).metadata();
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([
      { input: mark, top: Math.round((size - meta.height) / 2), left: Math.round((size - meta.width) / 2) },
    ])
    .png()
    .toFile(out);
}

await mkdir(path.join(PUB, 'icons', 'splash'), { recursive: true });

// 1. App icons used by manifest.json / layout.tsx / sw.js
const ICON_SIZES = [16, 32, 180, 192, 256, 512];
for (const s of ICON_SIZES) console.log('icon', await genIcon(s));

// 2. favicon source frames
for (const s of [16, 32, 48]) console.log('fav-src', await genFaviconSrc(s));

// 3. iOS splash screens — every entry in apple-splash-screens.ts
const SPLASH = [
  [2048, 2732], [2732, 2048], [1668, 2388], [2388, 1668], [1668, 2224],
  [2224, 1668], [1536, 2048], [2048, 1536], [1620, 2160], [2160, 1620],
  [1290, 2796], [2796, 1290], [1179, 2556], [2556, 1179], [1284, 2778],
  [2778, 1284], [1170, 2532], [2532, 1170], [1125, 2436], [2436, 1125],
  [1242, 2688], [2688, 1242], [828, 1792], [1792, 828], [1242, 2208],
  [2208, 1242], [750, 1334], [1334, 750], [640, 1136], [1136, 640],
];
for (const [w, h] of SPLASH) {
  console.log('splash', await genSplash(w, h, `apple-splash-${w}-${h}.png`));
}

console.log('DONE');
