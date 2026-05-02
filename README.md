# chopnow-app

ChopNow frontend — Next.js **16.2.4** (App Router) PWA. Tailwind + shadcn/ui.

## Surfaces

All four actors are served from the same Next.js app via App Router segments:

| Surface | Route | Notes |
|---|---|---|
| Consumer | `/` | Browse, order, track |
| Livreur | `/livreur` | GPS Wakelock + 15s heartbeat (validated POC-3) |
| Vendeur | `/vendor` | Catalogue, orders, payouts |
| Admin | `/admin` | Ops, KYC review, dashboards |

## Stack

- Next.js **16.2.4** · React 19 · TypeScript 5.7 · Node **22 LTS**
- **Tailwind CSS** + **shadcn/ui** (new-york style, neutral base, brand tokens via CSS vars)
- **PWA** — manifest + service worker (`public/sw.js`) + install prompt
- **Web Push** — VAPID-based, helpers in `lib/push.ts` (Story 1.11)
- **GPS background** — Wakelock API (Story 4.15)
- **Forms** — `react-hook-form` + `zod`
- **Hosting** — Vercel free tier
- **API** — `lib/api-client.ts` calls `chopnow-api` over HTTPS

## Quick start

```bash
nvm use                        # Node 22
cp .env.example .env.local     # placeholders work for local dev
npm install
npm run dev                    # http://localhost:3000
```

Make sure `chopnow-api` is running on `http://localhost:3001` (default).

## Repo layout

```
chopnow-app/
├── app/
│   ├── layout.tsx              # PWA meta + service worker registration
│   ├── page.tsx                # consumer landing
│   ├── livreur/                # /livreur (auth-gated)
│   ├── vendor/                 # /vendor
│   ├── admin/                  # /admin
│   └── api/health/route.ts     # /api/health for Vercel uptime
├── components/
│   ├── ui/                     # shadcn primitives (button, input)
│   ├── PhoneInput.tsx          # +237 6XX XXX XXX (Story 1.1)
│   ├── PwaInstallPrompt.tsx    # Story 1.10
│   └── RegisterServiceWorker.tsx
├── lib/
│   ├── api-client.ts           # typed fetch → chopnow-api
│   ├── auth.ts                 # client-side OTP + token storage
│   ├── push.ts                 # VAPID subscription helpers
│   └── utils.ts                # cn()
├── middleware.ts               # route guards (permissive in Sprint 1)
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # service worker (push + offline shell)
│   └── icons/                  # 192/512 PNGs (Sprint 1: export from /brand)
├── next.config.ts              # security headers, PWA config
├── tailwind.config.ts
├── components.json             # shadcn config
└── .github/workflows/ci.yml    # disabled until Sprint 1
```

## Adding shadcn components

```bash
npx shadcn@latest add dialog
npx shadcn@latest add toast
```

## Brand tokens

Defined in `app/globals.css` (CSS variables) and `tailwind.config.ts`:

- `chop-orange` `#E8570A` — primary CTA
- `chop-ink` `#0F0F0F` — text + dark backgrounds
- `chop-warm` `#FAFAF7` — consumer background
- `chop-mboue` `#1A5C3A` — success
- `chop-danger` `#D93025` — errors
- `chop-neutral` `#9A9A95` — placeholders

Pending Sugar Art delivery — palette will be updated when finalized.

## Epics

E1 Auth · E2 Catalogue · E3 Commande · E4 Livraison · E5 WhatsApp · E6 Admin · E7 Finance

## License

Proprietary — All Rights Reserved. See `LICENSE`.
