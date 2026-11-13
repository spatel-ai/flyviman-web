# flyviman-web

Frontend for the Flyviman aviation booking platform (Next.js): the customer site, the operator portal at `/operator` and the admin portal at `/admin`.

## Requirements

- Node.js 22, 22.12 or later (`engines` pins `22.x` so Vercel builds on 22)
- `flyviman-api` running on http://localhost:4000 for anything that loads data

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Checks

```bash
npm run lint
npm run typecheck
npm test                          # unit and component tests (Vitest)
npx playwright install chromium   # once
npm run test:e2e                  # browser tests (Playwright)
npm run build
```

## What is built

- **Customer site:** home page with the route story, registration and sign-in (email or mobile code), account, saved passengers, notifications, policies.
- **Operator portal (`/operator`):** onboarding and documents, fleet (add, edit, photos, documents, submit for review), availability (fleet timeline and aircraft calendar), and the team page to invite and manage staff. Staff see only the aircraft and actions their permissions allow.
- **Admin portal (`/admin`):** operator review, aircraft review, locations, users and staff accounts.
- **Not yet:** search and booking, payments, empty legs, air ambulance.

Page map and design rules: `../docs/frontend/frontend-design.md` and `../docs/frontend/design-system.md`. Progress: `../docs/progress.md`.

## Deployment

Hosted on Vercel, with `API_PROXY_TARGET` pointing at the API on Render so the browser sees one origin. Steps and variables: `../docs/deployment.md`.

## Documentation

Design documents live in `../docs`. Conventions for working in this repository are in `CLAUDE.md`.
