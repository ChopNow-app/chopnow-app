# chopnow-app

Frontend for **ChopNow** — a food delivery platform built for Douala, Cameroon. The PWA frontend serves four actors from one Next.js app:

- **Consumers** order food from local vendors (`/`)
- **Livreurs** (riders) receive and complete deliveries (`/livreur`)
- **Vendeurs** (vendors) manage menus and orders (`/vendor`)
- **Admins** run ops, KYC, finance (`/admin`)

The backend lives in [`chopnow-api`](https://github.com/ChopNow-app/chopnow-api). Sprint 1 starts **2026-05-04** — see the [project board](https://github.com/orgs/ChopNow-app/projects/3).

---

## Day 1 — get running in 5 minutes

### Prerequisites

| Tool                    | Version | Install                                                                                                                                         |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**             | 22 LTS  | `nvm install 22 && nvm use 22`                                                                                                                  |
| **npm**                 | ≥ 10    | Bundled with Node 22                                                                                                                            |
| **chopnow-api** running | latest  | See [`chopnow-api/README.md`](https://github.com/ChopNow-app/chopnow-api) — must be live at http://localhost:3001 before you start the frontend |

Supported on **macOS**, **Linux**, **Windows + WSL2**.

### Setup

```bash
git clone git@github.com:ChopNow-app/chopnow-app.git
cd chopnow-app
nvm use
cp .env.example .env.local
npm install
npm run dev                          # http://localhost:3000
```

Open http://localhost:3000 — you should see the consumer landing page with "Mange sans attendre."

### Generating the typed API client

After `chopnow-api` ships new endpoints, regenerate the typed client:

```bash
# 1. In chopnow-api:
npm run openapi:export               # writes openapi.json

# 2. In chopnow-app:
npm run codegen:api                  # regenerates lib/api/types.ts
```

---

## Troubleshooting

| Error                            | Fix                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `fetch failed` on auth calls     | Make sure `chopnow-api` is running on http://localhost:3001                                 |
| `Module not found: '@/lib/...'`  | Run `npm install` again — alias resolution caches                                           |
| `Hydration mismatch` errors      | Check `localStorage` reads in client components — wrap with `typeof window !== 'undefined'` |
| `EADDRINUSE: :::3000`            | Old dev server running. `lsof -ti:3000 \| xargs kill -9`                                    |
| `npm install` ESM peer conflicts | Use `--legacy-peer-deps` once, then `rm -rf node_modules` and rerun                         |

---

## Stack

- **Next.js 16.2.4** (App Router, Server Actions) · **React 19** · **TypeScript 5.7** · **Node 22 LTS**
- **Tailwind CSS** + **shadcn/ui** primitives + brand tokens via CSS vars
- **next-intl** for i18n (FR primary, EN placeholder)
- **react-hook-form** + **zod** for validated forms
- **openapi-fetch** + **openapi-typescript** for typed API client
- **PWA** — manifest + service worker (`public/sw.js`) + install prompt
- **Web Push** (VAPID) for notifications
- **Vitest** + **React Testing Library** for tests
- **ESLint 9** flat config + **Prettier** with Tailwind plugin + **Husky** pre-commit
- **Hosting** — Vercel free tier

## Repo layout

```
chopnow-app/
├── app/                          # Next.js App Router (routing only)
│   ├── layout.tsx                # NextIntlClientProvider + service worker
│   ├── page.tsx                  # consumer landing
│   ├── (consumer)/               # consumer routes
│   ├── livreur/ vendor/ admin/   # actor segments
│   └── api/health/               # /api/health
├── features/                     # domain logic grouped by actor
│   ├── auth/{components,hooks,actions}/
│   ├── consumer/                 # restaurants, cart, orders
│   ├── livreur/                  # GPS, course management
│   ├── vendor/                   # menu, orders dashboard
│   └── admin/                    # ops console
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── PhoneInput.tsx            # +237 input
│   └── PwaInstallPrompt.tsx
├── lib/
│   ├── api/                      # openapi-fetch client + generated types
│   ├── auth/                     # session storage + helpers
│   ├── i18n/                     # next-intl config
│   ├── push/                     # VAPID helpers
│   └── utils.ts                  # cn()
├── messages/{fr,en}.json         # translation strings
├── tests/                        # vitest setup
├── public/                       # manifest, sw.js, icons
└── .github/{workflows/ci.yml, CODEOWNERS, PULL_REQUEST_TEMPLATE.md}
```

## Folder convention

| When you write...                                            | Put it in                                      |
| ------------------------------------------------------------ | ---------------------------------------------- |
| A primitive UI component (button, input)                     | `components/ui/`                               |
| A widget shared across actors (PhoneInput, PwaInstallPrompt) | `components/`                                  |
| A feature-specific component, hook, or Server Action         | `features/<actor>/{components,hooks,actions}/` |
| A pure utility function (formatXAF, validatePhone)           | `lib/utils.ts`                                 |
| Anything that talks to the backend                           | `lib/api/`                                     |
| Translations                                                 | `messages/<locale>.json`                       |

Routes only live in `app/`; the actual UI/logic should be in `features/`.

## Useful commands

```bash
npm run dev              # http://localhost:3000
npm run build            # production build
npm run lint             # 0 warnings
npm run typecheck        # 0 errors
npm test                 # vitest
npm run test:watch       # vitest watch
npm run codegen:api      # regenerate typed client from chopnow-api openapi.json
npm run format           # prettier write
```

## Brand tokens

Defined in `app/globals.css` (CSS variables) + `tailwind.config.ts`:

- `chop-orange` `#E8570A` — primary CTA
- `chop-ink` `#0F0F0F` — text / dark surfaces
- `chop-warm` `#FAFAF7` — consumer background
- `chop-mboue` `#1A5C3A` — success
- `chop-danger` `#D93025` — errors
- `chop-neutral` `#9A9A95` — placeholders

Sugar Art final palette pending — these are interim values.

## Gitflow at a glance

```
   feature/<story-id>-<slug> ──► develop  (integration, run locally)
                                    │
                                    ▼
                                  main    (production)
```

Branch from `develop`, PR back to `develop`. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full flow.

## Epics

E1 Auth · E2 Catalogue · E3 Commande · E4 Livraison · E5 WhatsApp · E6 Admin · E7 Finance

## License

Proprietary — All Rights Reserved. See `LICENSE`.
