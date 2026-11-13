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
| Forms | React Hook Form with Zod (`@hookform/resolvers`) |
| Interactive primitives | Radix, through the unified `radix-ui` package |
| API types | Generated from the API's OpenAPI document with `openapi-typescript` |
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
| Browser tests | `npm run test:e2e` (starts the API and the app itself; needs `npm run db:up` in `flyviman-api`; first run needs `npx playwright install chromium`) |
| Regenerate API types | `npm run api:types` (after `npm run openapi:export` in `flyviman-api`) |
| Build | `npm run build` |
| Hero film frames | `node scripts/extract-hero-frames.mjs` (after replacing `media-src/hero/hero-desktop.mp4`; needs ffmpeg, ffprobe and cwebp) |
| Format | `npm run format` |

## Layout

```
src/
  app/
    (customer)/            customer site: home, about, services, charter, contact, account/ (profile,
                           passengers, notifications), legal/[slug], legal/image-credits
    (auth)/                login, register, verify, forgot-password, reset-password, operator/register
    (operator)/operator/   operator portal: dashboard, onboarding, aircraft (list, new, [id]),
                           availability (fleet timeline, [aircraftId] calendar), team
    (admin)/admin/         admin portal: dashboard, operators, operators/[id], users, aircraft,
                           aircraft/[id], locations
    layout.tsx             root: font, theme script, providers
    globals.css            design tokens
  components/
    ui/                    design-system primitives (Button; buttonClasses in button-classes.ts, Input, Select, Checkbox, Card, Badge,
                           Dialog and ConfirmDialog, Sheet, Tabs, Toast, Skeleton, Table and Pagination, Textarea)
    shared/                cross-feature pieces (PriceLabel, StatusBadge, EmptyState, FormAlert, LoadError,
                           ClientRedirect, RecordNotFound)
    layout/                SiteHeader (with SiteNavLinks and SITE_NAV), SiteFooter, AppShell, NavLinks, MobileNav, UserMenu
    motion/                Reveal (level 4, with the slit variant),
                           ScrollScrub and ScrollFilm (level 5; gsap is imported only in load-gsap.ts), TiltCard and Magnetic
                           (pointer feedback, on spring.ts), PageTransition (level 3)
    marketing/             SectionHeading, PageHero, EnquiryLink (customer marketing pages)
    theme/                 ThemeScript, ThemeSwitch
  content/                 marketing copy (home, about, services, charter, contact), site photographs
                           (images/) and image-credits.ts
  features/<feature>/      feature UI, hooks, schemas (auth, account, home, about, services, charter, contact, legal,
                           operator-onboarding, operator-aircraft, operator-availability, operator-staff,
                           admin-operators, admin-users, admin-aircraft, admin-locations)
  lib/
    api/                   apiFetch, ApiError, messages by error code, query keys, generated types
    auth/                  session and server-side API reads (server only), roles
    format/                money, date and time-zone formatting (zoned.ts)
    env.ts                 validated public environment; serverApiUrl (direct API address for
                           server-side calls when API_PROXY_TARGET is set)
    utils.ts               cn()
  providers/               QueryProvider
  proxy.ts                 first-line route protection, session rotation, 404s for unknown slugs
e2e/                       Playwright browser journeys; helpers in e2e/support
public/hero/               hero film frames and posters (made by scripts/extract-hero-frames.mjs, committed)
scripts/                   extract-hero-frames.mjs: clip in media-src/ (git-ignored) to WebP frames
```

Full structure and the page map: `../docs/frontend/frontend-design.md`.

## Conventions

- **Design tokens only.** Use the utilities generated from `globals.css` (`bg-surface`, `text-muted`, `text-h2`, `rounded-lg`, `shadow-md`, `max-w-wide`). No hex values, no arbitrary sizes, no `dark:` variants: tokens switch themes themselves. Rules: `../docs/frontend/design-system.md`.
- **Apple-inspired, not copied.** Calm, spacious, typographic; one accent; one primary action per view. No Apple assets or trademarks.
- **Pages compose; features hold logic.** Nothing but routing and composition in `app/`. Features do not import from each other.
- **Server components by default.** `"use client"` only for state, effects or browser APIs, as low in the tree as possible.
- **All API access goes through `apiFetch`.** Client-side data uses TanStack Query with keys from `lib/api/query-keys.ts`. Switch on `ApiError.code`, never on the message; wording lives in `lib/api/messages.ts`. On the server use `serverGet` from `lib/auth/server-api.ts`. The one exception is sending a file to a signed upload URL, which is a plain `fetch` without credentials.
- **Protected surfaces** are gated twice: `proxy.ts` turns away visitors with no session, and each protected layout calls `requireRole()` inside `<Suspense>` before rendering anything. Hiding a button by role is a convenience; the API decides.
- **Types come from the API.** Use `Schemas["…"]` from `lib/api/types.ts`; do not hand-write request or response shapes.
- **Forms** submit only through `<Button type="submit">`, which is disabled until the page is interactive (D-095); never a raw `<button type="submit">`.
- **Forms:** React Hook Form with a Zod schema in the feature's `schema.ts`; `applyApiError` puts the API's field errors under the fields; `FormAlert` shows the form-level message.
- **Prices render only through `PriceLabel`,** which requires a `priceType`. Booking status and payment status are always two separate badges.
- **Never cache** prices, availability or statuses beyond the validity the API returns.
- **Portal navigation:** add an item to a portal's `NAV` in the same change as its page, never before.
- **Environment:** `NEXT_PUBLIC_` values plus the server-only `API_PROXY_TARGET` (hosting, D-065), declared in `src/lib/env.ts` and `.env.example`. No secrets: they live in the API.
- **Motion** follows the five-level scale in `../docs/frontend/motion-design.md`; use the `motion-effect` skill to add or change one. Wrap each new customer page's content in `PageTransition`; use `Reveal` only for content that starts below the first screen (`variant="slit"` for a section heading); never animate safety notices, prices, forms or status badges. Anything that plays on load is CSS. `gsap` is imported only inside `components/motion/load-gsap.ts`, dynamically; scrolling stays native, and only the home page's hero film (`features/home/hero.tsx`, values in `hero-config.ts`, frames made by `scripts/extract-hero-frames.mjs` from `media-src/`, which is not committed) and its showpiece (`ScrollFilm`) are pinned, with CSS `position: sticky`. `TiltCard` and `Magnetic` are for customer marketing sections only.
- **Marketing copy** lives in typed modules in `src/content/` (`home.ts`, `about.ts`, `services.ts`, `charter.ts`, `contact.ts`), imported from flyviman.com with the `site-content-import` skill. Components do not hold copy inline. Claims the business has not confirmed stay out (`../docs/open-decisions.md`).
- **Pages with a dynamic segment** (`[slug]`, `[id]`): a public one gets its slugs added to `KNOWN_SLUGS` in `proxy.ts` so an unknown address answers 404; a signed-in detail page shows `RecordNotFound` when `isNotFoundError(error)`. The not-found guard (`src/proxy.spec.ts`, `e2e/not-found.e2e.ts`) finds new pages by itself and fails until they are handled (D-094).
- **Redirecting into a page with a form** from a page that streams: use `ClientRedirect`, not `redirect()` (which also reloads the destination a moment later).
- **Photographs** come only from `src/content/image-credits.ts`, where each has alt text, photographer, source and licence. Rules for choosing one: `../docs/frontend/motion-design.md`. They apply to Flyviman's own pictures too.
- **Class names** are merged with `cn` (`lib/utils.ts`), which knows our type-scale names. A new `--text-*` token must be added to its list, or a text colour beside it is silently dropped (D-078).
- **Visual baseline:** `e2e/visual.e2e.ts` compares screenshots of the main pages. After an intended visual change run `npm run test:e2e -- visual --update-snapshots` and commit the new images.
- **No tokens in `localStorage` or `sessionStorage`.** The session is the API's `HttpOnly` cookies. (The theme preference is stored there; it is not a credential.)

## Testing

Strategy and conventions: `../docs/testing-strategy.md`.

- Formatting, schemas and logic-bearing components: Vitest.
- Pages and journeys: Playwright, written with the `/playwright-test` skill, on both the desktop and mobile projects.
- A change is not done until `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` pass. CI (`.github/workflows/ci.yml`) runs all of them on every pull request and push to `main`; after an intended visual change, also run it by hand with "update visual baselines" (`../docs/testing-strategy.md`).

## Skills and agents

`/ui-page`, `/playwright-test`; agents `code-reviewer`, `security-reviewer`, `test-runner`. They live in `../.claude/`, so start Claude Code from the workspace root to have them available.
