<!-- Title format: [<story-id>] <Story name> — <slice if needed> -->
<!-- Examples: [1.1] Inscription Consommateur par OTP — frontend form -->

## Story

Closes #<issue-number>
Story ID: **<e.g. 1.1, 3.6>**
Epic: **<E1 Auth · E2 Catalogue · E3 Commande · E4 Livraison · E5 WhatsApp · E6 Admin · E7 Finance>**

## Summary

<!-- 1-3 bullets: what changed and why. Link the source-of-truth epic file. -->

-

## Acceptance criteria checklist

<!-- Copy the frontend slice of the story's acceptance criteria from `_bmad-output/planning-artifacts/epics/`.
     Tick what this PR delivers; prefix deferred items with [SKIP] + follow-up issue link. -->

- [ ]
- [ ]
- [ ]

## Test plan

<!-- How to verify in a browser. Include actor (consumer/livreur/vendor/admin) + the route. -->

```
1. cd chopnow-app && npm run dev
2. Open http://localhost:3000/<route>
3. ...
```

## Architecture rules respected

- [ ] Code added under `features/<actor>/` (not under `app/`) when it's domain logic
- [ ] Reused shared `components/ui/` primitives instead of forking them
- [ ] Server Actions used for mutations where appropriate (vs client-side `fetch`)
- [ ] No direct `process.env` reads in client components

## Security checklist

- [ ] User input passes through a `zod` schema before submission
- [ ] User-rendered text from the API is treated as untrusted (sanitize before injecting raw HTML)
- [ ] No secrets, API keys, or VAPID private keys added to client code
- [ ] Routes that need auth are protected via the session check helper

## i18n

- [ ] All user-facing strings in this PR use `next-intl` translations (no hardcoded French in JSX)
- [ ] French translations added to `messages/fr.json`
- [ ] English placeholders added to `messages/en.json` (can be the FR text duplicated for now)

## Visual changes

<!-- Drop screenshots / short screen recordings here. Include both desktop and a 360px-wide mobile shot. -->
