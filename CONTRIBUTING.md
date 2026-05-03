# Contributing — chopnow-app

> First-time setup is in [`README.md`](./README.md). This file covers what to do **after** you can run the app.

## Gitflow

Two long-lived branches + short-lived feature branches.

```
              ┌──────── feature/1.1-otp-form ────────┐
              │                                      ▼
   develop ───┴──────────────────────────────────► develop  (integration / staging)
                                                       │
                                                       ▼ (after manual QA)
                                                     main   (production)
```

| Branch                      | Purpose                                          | Protected?         |
| --------------------------- | ------------------------------------------------ | ------------------ |
| `main`                      | Production. Vercel deploys from here.            | ✅ — PR + 1 review |
| `develop`                   | Integration. All feature work merges here first. | ✅ — PR + 1 review |
| `feature/<story-id>-<slug>` | Short-lived (1–5 days), one per story            | no                 |
| `fix/<slug>`                | Bug fix outside a story                          | no                 |
| `chore/<slug>`              | Tooling / docs / dep bumps                       | no                 |

### Daily workflow

```bash
git checkout develop && git pull --ff-only
git checkout -b feature/1.1-otp-form
# code...
git push -u origin feature/1.1-otp-form
gh pr create --base develop --fill   # auto-targets develop

# After merge, develop is auto-deployed to Vercel preview
# When stable: gh pr create --base main --head develop
```

### Branch naming

- `feature/1.1-otp-form`, `feature/3.6-order-confirmation`
- `fix/4.4-rider-heartbeat-flake`
- `chore/upgrade-next-17`

## Commit messages

Format: `<scope>: <imperative summary>`

Scope = top-level folder (`consumer`, `livreur`, `vendor`, `admin`, `auth`, `lib`, `components`, …).

```
auth: add OTP request form with phone validation
livreur: wire wakelock for GPS tracking
lib(api): regenerate types from chopnow-api 0.2.0 spec
chore: upgrade next-intl to 4.12
```

## Local checks before pushing

```bash
npm run lint        # 0 warnings
npm run typecheck   # 0 errors
npm test            # all green
npm run build       # produces .next/
```

CI runs the same four commands. Husky also runs:

- **`pre-commit`** — `lint-staged` formats + lints staged files (fast)
- **`pre-push`** — typecheck + tests

Bypass: `git commit --no-verify` / `git push --no-verify`. Use sparingly.

## Architecture rules (enforced in review)

### 1. Routes live in `app/`; logic lives in `features/`

`app/livreur/page.tsx` should be ~10 lines that import a `<LivreurDashboard />` from `features/livreur/components/`. Don't pile business logic into the route file.

### 2. Server Actions for mutations, when it makes sense

Mutations that don't need streaming/optimistic UI → Server Action. OTP verify, order placement, profile update — all good Server Action candidates. Real-time stuff (rider heartbeat, dispatch) stays as REST.

### 3. Always use the typed API client

```ts
// ✅ typed client (auto-generated from openapi.json)
import { api } from '@/lib/api/api-client';
const { data, error } = await api.POST('/api/auth/request-otp', {
  body: { phone: '670000000' },
});

// ❌ raw fetch — only for streaming or file uploads
fetch('/api/...');
```

### 4. Form pattern

`react-hook-form` + `zod` schema beside the component. See `features/auth/components/OtpRequestForm.tsx` for the canonical example. Don't roll your own validation.

### 5. i18n — no hardcoded user-facing strings

```tsx
// ✅
import { useTranslations } from 'next-intl';
const t = useTranslations('Auth');
<button>{t('requestOtp')}</button>

// ❌
<button>Recevoir le code</button>
```

Add new strings to **both** `messages/fr.json` and `messages/en.json` (English can be the FR text duplicated for now).

### 6. Brand colors — use Tailwind tokens

```tsx
<button className="bg-chop-orange text-white">Commander</button>
```

Don't hardcode hex values in JSX.

## Story workflow

1. **Claim a card** on the [project board](https://github.com/orgs/ChopNow-app/projects/3) — drag `Backlog` → `In Progress`
2. **Read the story** — issue body links the source-of-truth `.md`
3. **Find the right place** — most Sprint 1 stories live in `features/<actor>/`
4. **Branch + code** — write a happy-path test
5. **PR to develop** — fill the auto-loaded template
6. **CI green + 1 approval** → merge → branch auto-deletes

## Testing expectations per story

Tests land **with the story**, not before. The infrastructure is ready (Vitest + RTL); fill in tests for code you write.

- **Unit/component test** for any new component or hook with conditional logic — see `components/PhoneInput.test.tsx` for the pattern (RTL + userEvent + zod assertions)
- **Edge cases** for every error branch the spec calls out — invalid phone format, network failure, expired OTP, etc.
- **No tests for**: trivial layouts, bare delegates to a single Server Action, shadcn primitives we haven't customized
- **E2E tests (Playwright)** are deferred to Sprint 2 — don't write them in Sprint 1

Coverage isn't enforced; reviewers will push back on a PR that ships zero tests for non-trivial logic.

## Adding a shadcn component

```bash
npx shadcn@latest add toast
npx shadcn@latest add dialog
```

Then commit `components/ui/<name>.tsx` and any added deps in `package.json`.

## Adding a new translation key

1. Add the key to `messages/fr.json` (the source language)
2. Mirror it in `messages/en.json` (can duplicate FR for now)
3. Use it via `const t = useTranslations('SectionName'); t('keyName')`

## FAQ

**Q: Where do I put a hook used by 2+ actors?**
`lib/hooks/<name>.ts` if pure, `features/auth/hooks/` if auth-related, otherwise create `features/shared/hooks/`.

**Q: I need state across pages — Zustand? Jotai?**
Default: React Context (see `useSession`). Add a state library only if Context becomes a pain point — not preemptively.

**Q: Server Component vs Client Component?**
Default to Server. Use `'use client'` only when you need state, effects, or browser APIs (localStorage, navigator, etc.).

**Q: How do I add a feature flag?**
Sprint 1 doesn't have flag infrastructure. For now: gate via env var (`NEXT_PUBLIC_FEATURE_X`). PostHog flags arrive in Sprint 2.
