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

## Deployment

Hosted on Vercel, with `API_PROXY_TARGET` pointing at the API on Render so the browser sees one origin. Steps and variables: `../docs/deployment.md`.

## Documentation

Design documents live in `../docs`. Conventions for working in this repository are in `CLAUDE.md`.
