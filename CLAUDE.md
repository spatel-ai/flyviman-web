# flyviman-web

Next.js frontend for the Flyviman aviation booking platform. One application, three surfaces: the customer site, the operator portal (`/operator`) and the admin portal (`/admin`).

Workspace rules, the business rules that must never be broken, and the index of design documents are in `../CLAUDE.md`. Read that first.

## This Next.js version is newer than you may expect

The framework's own documentation ships with the package at `node_modules/next/dist/docs/`. Read the relevant page there before using a framework feature. Things that differ from older versions:

- **Cache Components and Partial Prefetching are on** (`next.config.ts`). Nothing is cached unless marked with `"use cache"` (pair it with `cacheLife`). A component that reads request-time data (cookies, headers, uncached fetches) must sit inside `<Suspense>`. Guide: `01-app/01-getting-started/08-caching.md`.
- **`proxy.ts` replaces `middleware.ts`.** Reference: `01-app/03-api-reference/03-file-conventions/proxy.md`.
- **The React Compiler is on.** Do not add `useMemo`, `useCallback` or `memo` by hand for performance.
- Route props are typed with the generated `PageProps<"/path">` and `LayoutProps<"/path">` helpers; `npm run typecheck` generates them first.

## Stack (as installed)

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5, strict |
| Styling | Tailwind CSS 4 with design tokens in `src/app/globals.css` |
| Server state | TanStack Query |
| Validation | Zod |
| Forms | React Hook Form with Zod (install with the first form) |
| Interactive primitives | Radix (install the specific package when first needed) |
| Unit and component tests | Vitest with Testing Library, `*.spec.ts(x)` next to the code |
| Browser tests | Playwright, `e2e/*.e2e.ts`, desktop and mobile projects |
| Lint and format | ESLint (`eslint-config-next`), Prettier |

## Commands

Run from this directory.

| Task | Command |
|---|---|
| Run in development | `npm run dev` (http://localhost:3000) |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Unit and component tests | `npm test` |
| Browser tests | `npm run test:e2e` (builds and starts the app itself; first run needs `npx playwright install chromium`) |
| Build | `npm run build` |
| Format | `npm run format` |

## Layout

```
src/
  app/
    (customer)/            customer site: layout, home, and later results, booking, trips, account
    (auth)/                sign-in and registration (added in M0)
    (operator)/operator/   operator portal
    (admin)/admin/         admin portal
    layout.tsx             root: font, providers
    globals.css            design tokens
  components/
    ui/                    design-system primitives (Button, Input, Card, Badge)
    shared/                cross-feature pieces (PriceLabel)
    layout/                SiteHeader, SiteFooter, AppShell
  features/<feature>/      feature UI, hooks, API calls, schemas, types (added per milestone)
  lib/
    api/                   apiFetch and ApiError
    format/                money and date formatting
    env.ts                 validated public environment
    utils.ts               cn()
  providers/               QueryProvider
e2e/                       Playwright browser tests
```

Full structure and the page map: `../docs/frontend/frontend-design.md`.

## Conventions

- **Design tokens only.** Use the utilities generated from `globals.css` (`bg-surface`, `text-muted`, `text-h2`, `rounded-lg`, `shadow-md`, `max-w-wide`). No hex values, no arbitrary sizes, no `dark:` variants: tokens switch themes themselves. Rules: `../docs/frontend/design-system.md`.
- **Apple-inspired, not copied.** Calm, spacious, typographic; one accent; one primary action per view. No Apple assets or trademarks.
- **Pages compose; features hold logic.** Nothing but routing and composition in `app/`. Features do not import from each other.
- **Server components by default.** `"use client"` only for state, effects or browser APIs, as low in the tree as possible.
- **All API access goes through `apiFetch`.** Client-side data uses TanStack Query. Switch on `ApiError.code`, never on the message.
- **Prices render only through `PriceLabel`,** which requires a `priceType`. Booking status and payment status are always two separate badges.
- **Never cache** prices, availability or statuses beyond the validity the API returns.
- **Portal navigation:** add an item to a portal's `NAV` in the same change as its page, never before.
- **Environment:** only `NEXT_PUBLIC_` values, declared in `src/lib/env.ts` and `.env.example`. Secrets live in the API.
- **No tokens in `localStorage` or `sessionStorage`.** The session is the API's `HttpOnly` cookies.

## Testing

Strategy and conventions: `../docs/testing-strategy.md`.

- Formatting, schemas and logic-bearing components: Vitest.
- Pages and journeys: Playwright, written with the `/playwright-test` skill, on both the desktop and mobile projects.
- A change is not done until `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` pass.

## Skills and agents

`/ui-page`, `/playwright-test`; agents `code-reviewer`, `security-reviewer`, `test-runner`. They live in `../.claude/`, so start Claude Code from the workspace root to have them available.
