# chopnow-app

ChopNow frontend — Next.js **16.2.4** (App Router) PWA.

## Surfaces

All four actors are served from the same Next.js app via App Router segments:

| Surface | Route | Notes |
|---|---|---|
| Consumer | `/` | Browse, order, track |
| Livreur | `/livreur` | GPS Wakelock + 15s heartbeat (validated POC-3) |
| Vendeur | `/vendor` | Catalogue, orders, payouts |
| Admin | `/admin` | Ops, KYC review, dashboards |

## Stack

- Next.js 16.2.4 (App Router, Server Actions, RSC)
- PWA — installable, no app store
- Push notifications — Web Push API + VAPID
- GPS background tracking — Wakelock API (Android Chrome + iOS Safari validated)
- Hosting — Vercel free tier
- API — calls `chopnow-api` (NestJS) over HTTPS

## Status

Sprint 1 starts **2026-05-04**. See [project board](https://github.com/orgs/ChopNow-app/projects/3) for delivery tracking.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run lint
```

## Repo layout (planned)

```
chopnow-app/
├── app/
│   ├── (consumer)/      # /, /restaurant/[id], /cart, /orders/[id]
│   ├── livreur/         # /livreur, /livreur/[orderId]
│   ├── vendor/          # /vendor, /vendor/menu, /vendor/orders
│   └── admin/           # /admin, /admin/kyc, /admin/finance
├── components/
├── lib/
└── public/
```

## Epics

E1 Auth · E2 Catalogue · E3 Commande · E4 Livraison · E5 WhatsApp · E6 Admin · E7 Finance

## License

Proprietary — All Rights Reserved. See `LICENSE`.
