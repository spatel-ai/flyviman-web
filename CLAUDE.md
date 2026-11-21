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
| Hero film frames | `node scripts/extract-hero-frames.mjs` (after replacing `media-src/hero/hero-desktop.mp4`; Node 22.18+, ffmpeg, ffprobe and cwebp) |
| Format | `npm run format` |

## Layout

```
src/
  app/
    (customer)/            customer site: home, search (landing, [searchId], [searchId]/[resultId], scheduled/[searchId]), empty-legs (list, [id]), about, services,
                           charter, charter/fleet, aviation-solutions, aircraft-sales (and [slug]), pilots, contact,
                           account/ (profile, passengers, notifications, trips, trips/[reference], trips/[reference]/pay, trips/[reference]/receipts/[payment], air-ambulance, air-ambulance/[reference]), air-ambulance (landing and request form), book/[searchId]/[resultId] (request a flight), legal/[slug], legal/image-credits,
                           compare/home-v1 (the frozen pre-M12 home, noindex and unlinked, until the owner chooses; D-110)
    (auth)/                login, register, verify, forgot-password, reset-password, operator/register
    (operator)/operator/   operator portal: dashboard, onboarding, aircraft (list, new, [id]),
                           availability (fleet timeline, [aircraftId] calendar), pricing, team, requests (list, [reference]), bookings (list, [reference]), air-ambulance (list, [reference]), empty-legs (list, new, [id]), notifications
    (admin)/admin/         admin portal: dashboard, operators, operators/[id], users, aircraft,
                           aircraft/[id], locations, documents, pricing/rules,
                           pricing/calculations, pricing/calculations/[id], enquiries, enquiries/[id],
                           air-ambulance (queue, [reference]), promotions, notifications, empty-legs, audit-logs, content, matching-limits, roles, bookings, bookings/[reference],
                           change-requests, payments, refunds (Due and History)
    layout.tsx             root: font, theme script, providers
    globals.css            design tokens
  components/
    ui/                    design-system primitives (Button; buttonClasses in button-classes.ts, Input, Select, Checkbox, Card, Badge,
                           Dialog and ConfirmDialog, Sheet, Tabs, Toast, Skeleton, Table and Pagination, Textarea)
    shared/                cross-feature pieces (PriceLabel, StatusBadge, ExpiryBadge, EmptyState, FormAlert, LoadError,
                           ClientRedirect, RecordNotFound, LocationField, CancellationTerms; restrictions/: RestrictionsEditor and its schema)
    layout/                customer: SiteHeader (SiteNavLinks, SITE_NAV, MoreMenu on desktop, MoreSheet on phones),
                           SiteTabBar and MobileTabBar (phone tab bar), StickyActionBar (phone detail pages), SiteFooter;
                           portals: AppShell, NavLinks, MobileNav, UserMenu
    motion/                Reveal (level 4, with the slit variant), ScrollScrub (level 5, the footer wordmark and page
                           heroes; gsap is imported only in load-gsap.ts), TiltCard and Magnetic
                           (pointer feedback, on spring.ts), PageTransition (level 3)
    marketing/             SectionHeading, PageHero, EnquiryLink, IconBadge with concept-icons.ts (Lucide only), ReadMore
                           (customer marketing pages)
    booking/               the customer search card and its pickers (SearchWidget, AirportPicker, FareCalendar,
                           TravellerPicker, FieldTile, ResponsivePicker: popover on desktop, sheet on phones; useToday;
                           scheduled-search-form and scheduled-traveller-picker for the airline search)
    booking-v1/            frozen copy of the pre-M12 search card, used only by compare/home-v1
    theme/                 ThemeScript, ThemeSwitch (Light or Dark; light by default, D-108)
  content/                 marketing copy (home, about, services, charter, fleet, contact, aviation-solutions,
                           aircraft-sales, pilots, search), site photographs (images/) and image-credits.ts
  features/<feature>/      feature UI, hooks, schemas (auth, account, booking-request, trips, home, home-v1 (frozen), about, services, charter,
                           contact, legal, aviation-solutions, aircraft-sales, pilots,
                           search (results, filters, detail), search-landing,
                           operator-onboarding, operator-aircraft, operator-availability, operator-staff, operator-pricing, operator-requests, operator-bookings, operator-air-ambulance, air-ambulance,
                           admin-operators, admin-users, admin-aircraft, admin-locations, admin-documents,
                           admin-pricing, admin-enquiries, admin-air-ambulance, admin-promotions, admin-cancellation-terms,
                           admin-bookings, admin-finance (payments and refunds), admin-audit, admin-content, admin-empty-legs,
                           admin-matching-limits, admin-roles, empty-legs, operator-empty-legs, scheduled-search,
                           restrictions, payment (the pay page and receipt))
  lib/
    api/                   apiFetch, ApiError, messages by error code, query keys, generated types
    auth/                  session and server-side API reads (server only), roles
    empty-legs/            empty-leg offer types and formatting, shared by the customer, operator and admin pages
    format/                money, date and time-zone formatting (zoned.ts); aircraft.ts (categoryLabel,
                           formatDuration)
    pricing-rules.ts       pricing rule helpers shared by the admin pricing and matching-limits pages
    env.ts                 validated public environment; serverApiUrl (direct API address for
                           server-side calls when API_PROXY_TARGET is set)
    utils.ts               cn()
  providers/               QueryProvider
  proxy.ts                 first-line route protection, session rotation, 404s for unknown slugs,
                           the /api/v1 proxy with the visitor's signed address (lib/client-address.ts)
e2e/                       Playwright browser journeys; helpers in e2e/support
public/hero/               the home page hero film: WebP frame sets desktop/, phone/ and tablet-portrait/ (portrait slices
                           along the focal path in src/features/home/focal-path.ts) and the first and last frames as posters,
                           made by scripts/extract-hero-frames.mjs (Node 22.18+) from the source clip in the uncommitted
                           media-src/; the script writes each set's count and size to src/features/home/hero-frames.json
public/hero-v1/            frames of the pre-M12 film, used only by compare/home-v1
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
- **Environment:** `NEXT_PUBLIC_MOCK_CHECKOUT=1` shows the mock checkout panel on the pay page (`features/payment`, `lib/payments/providers.ts`); development and Playwright only, never set in a deployment. `NEXT_PUBLIC_` values plus the server-only `API_PROXY_TARGET` (hosting, D-065), declared in `src/lib/env.ts` and `.env.example`. One secret, server only: `WEB_PROXY_SECRET`, shared with the API, with which `proxy.ts` and `serverGet` sign the visitor's address (`src/lib/client-address.ts`); optional (unset, `/api/v1` is proxied without it and every visitor counts as this host). It signs only where the host overwrites `x-real-ip`: on Vercel (`VERCEL=1`) or with the server-only opt-in `TRUST_REAL_IP=1` (`trustsRealIp()` in `env.ts`, D-123). `API_PROXY=signed npm run test:e2e` runs the proxied suite with it. Never import it into `env.ts` or browser code. Every other secret lives in the API. `CSP_REPORT_ONLY=1` sends the Content-Security-Policy (`lib/csp.ts`, set in `next.config.ts`) as report-only, for emergencies; it is read at build time, so it takes a rebuild. A script or connection to another origin must be added to `lib/csp.ts` or it is blocked.
- **Motion** follows the five-level scale in `../docs/frontend/motion-design.md`; use the `motion-effect` skill to add or change one. Wrap each new customer page's content in `PageTransition`; use `Reveal` only for content that starts below the first screen (`variant="slit"` for a section heading); never animate safety notices, prices, forms or status badges. Anything that plays on load is CSS. `gsap` is imported only inside `components/motion/load-gsap.ts`, dynamically; scrolling stays native, and the only pinned element is the home page hero film (`features/home/hero.tsx`, held with CSS `position: sticky`; the charter showpiece stays retired). The film plays on every screen with motion allowed and no data saver (CR-2d): upright phones (under 744 px wide or under 600 px tall) play the `phone` set and upright tablets the `tablet-portrait` set, both portrait slices cropped along the focal path (`focal-path.ts`, keyframes of time and horizontal centre, shared with the script), and everything else the `desktop` set (`HERO.film.screens`); the set switches live on rotation. Turned phones (`HERO.film.turnedPhone`), reduced motion, data saver, no JavaScript and sustained slow frames (`HERO.giveUp`) give the still hero (on phones the first frame as a band, card below). Setting `HERO.film.phones` to false switches the portrait sets off. `TiltCard` and `Magnetic` are for customer marketing sections only.
- **Marketing copy** lives in typed modules in `src/content/` (`home.ts`, `about.ts`, `services.ts`, `charter.ts`, `fleet.ts`, `contact.ts`, `aviation-solutions.ts`, `aircraft-sales.ts`, `pilots.ts`), imported from flyviman.com with the `site-content-import` skill. Components do not hold copy inline. The client approved migrating all of flyviman.com (D-092); the business rules still apply (`../docs/open-decisions.md`, Marketing content).
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
- A change is done when `npm run lint`, `npm run typecheck`, the unit specs it touches (`npm test -- <name>`) and its Playwright file (`npx playwright test <name>`) pass. Full suites only when asked: CI (`.github/workflows/ci.yml`) runs everything on every pull request and push to `main` (`../docs/testing-strategy.md`).

## Working in a worktree

Concurrent tasks run in worktree slots (`../docs/development-workflow.md`), created by `../scripts/worktree.sh`:
- **Location:** `.worktrees/<task>/flyviman-web` at the workspace root, always beside its paired `.worktrees/<task>/flyviman-api`. The browser suite starts the API from `../flyviman-api`, and `npm run api:types` reads `../flyviman-api/openapi.json`, so both resolve to the task's own API.
- **Ports:** Playwright runs with `PORT=30n0 API_PORT=40n0`. Never 3000 or 4000–4002, which belong to the main checkout; `reuseExistingServer` would quietly test someone else's server.
- **Documents:** from a worktree, `../docs/` and `../CLAUDE.md` resolve inside `.worktrees/<task>/`, where they do not exist. Read them at the workspace root, and never edit them from a task; list document changes in the report.
- **Generated types:** `src/lib/api/generated/schema.d.ts` is regenerated (`npm run api:types`), never merged as text.

## Skills and agents

`/ui-page`, `/playwright-test`, `/motion-effect`, `/site-content-import`; agents `scout`, `builder`, `merger`, `code-reviewer`, `security-reviewer`, `test-runner`. They live in `../.claude/`, so start Claude Code from the workspace root to have them available.
