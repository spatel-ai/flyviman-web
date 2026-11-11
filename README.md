# flyviman-web

Frontend for the Flyviman aviation booking platform (Next.js): the customer site, the operator portal at `/operator` and the admin portal at `/admin`.

## Requirements

- Node.js 22 or later
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

## Documentation

Design documents live in `../docs`. Conventions for working in this repository are in `CLAUDE.md`.
