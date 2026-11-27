import {
  expect,
  test as base,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  API_URL,
  latestPasswordLink,
  PASSWORD,
  signIn,
  uniqueEmail,
} from "./support/api";
import { approvedOperator, csrf } from "./support/operators";
import { protectedRoutes, type ProtectedRoute } from "./support/access-routes";

/**
 * Access matrix: every page under the protected surfaces is opened by a
 * visitor and by each of the six roles, and the browser must end where the
 * role belongs. The routes are read from the `src/app` tree, so a new page is
 * covered (or fails the "has an access rule" check) without anyone listing it.
 *
 * What is asserted, per page:
 * - signed out: sent to `/login?next=<that path>`;
 * - a role outside the page's surface: sent to its own home (`requireRole`);
 * - a role inside the surface: stays on the page; for pages only some roles may
 *   use (admin pages by the API's role table, operator administrator pages),
 *   a role that may not use it sees no data and no table, and every link in a
 *   role's navigation is to a page it may open.
 *
 * Sign-in happens once per role per worker; each visit gets a fresh browser
 * context from that saved state. Desktop project only: the navigation is
 * behind a menu button on phones, and the rules do not depend on screen size.
 */

type Identity =
  | "anonymous"
  | "customer"
  | "operatorAdmin"
  | "operatorStaff"
  | "ops"
  | "finance"
  | "superAdmin";

const SIGNED_IN: Exclude<Identity, "anonymous">[] = [
  "customer",
  "operatorAdmin",
  "operatorStaff",
  "ops",
  "finance",
  "superAdmin",
];

type Surface = "customer" | "operator" | "admin";
const SURFACE_OF: Record<Exclude<Identity, "anonymous">, Surface> = {
  customer: "customer",
  operatorAdmin: "operator",
  operatorStaff: "operator",
  ops: "admin",
  finance: "admin",
  superAdmin: "admin",
};
/** Where `requireRole` sends a role that does not belong to a surface (`homeFor`). */
const HOME: Record<Surface, string> = {
  customer: "/",
  operator: "/operator",
  admin: "/admin",
};

type Staff = "ops" | "finance" | "superAdmin";
const INTERNAL: Staff[] = ["ops", "finance", "superAdmin"];
const OPS_SA: Staff[] = ["ops", "superAdmin"];
const FIN_SA: Staff[] = ["finance", "superAdmin"];
const OPS_FIN_SA = INTERNAL;

/**
 * Who may use each admin page, from the API's role table
 * (`docs/architecture/security-rbac.md`, the `@Roles()` on the page's data
 * routes). A page not listed here fails the "every page has a rule" check.
 */
const ADMIN_ACCESS: Record<string, Staff[]> = {
  "/admin": INTERNAL,
  "/admin/aircraft": OPS_SA,
  "/admin/aircraft/[id]": OPS_SA,
  "/admin/air-ambulance": OPS_SA,
  "/admin/air-ambulance/[reference]": OPS_SA,
  "/admin/audit-logs": INTERNAL,
  "/admin/bookings": OPS_FIN_SA,
  "/admin/bookings/[reference]": OPS_FIN_SA,
  "/admin/category-config": INTERNAL,
  "/admin/change-requests": OPS_SA,
  "/admin/content": OPS_SA,
  "/admin/documents": OPS_SA,
  "/admin/empty-legs": OPS_SA,
  "/admin/enquiries": OPS_SA,
  "/admin/enquiries/[id]": OPS_SA,
  "/admin/locations": OPS_SA,
  "/admin/matching-limits": INTERNAL,
  // Notifications are the signed-in user's own.
  "/admin/notifications": INTERNAL,
  "/admin/operators": INTERNAL,
  "/admin/operators/[id]": INTERNAL,
  "/admin/payments": FIN_SA,
  "/admin/pricing/calculations": INTERNAL,
  "/admin/pricing/calculations/[id]": INTERNAL,
  "/admin/pricing/rules": FIN_SA,
  "/admin/promotions": FIN_SA,
  "/admin/reconciliation": FIN_SA,
  "/admin/refunds": FIN_SA,
  "/admin/reports": INTERNAL,
  "/admin/roles": ["superAdmin"],
  "/admin/settlements": FIN_SA,
  "/admin/users": OPS_SA,
};

/**
 * Operator pages only the organisation's administrator uses. Every other
 * operator page is open to both operator roles (staff then see what their
 * capabilities allow; the test's staff member holds all four).
 */
const OPERATOR_ADMIN_ONLY = new Set([
  "/operator/aircraft/new",
  "/operator/air-ambulance",
  "/operator/air-ambulance/[reference]",
  "/operator/onboarding",
  "/operator/pricing",
  "/operator/settlements",
  "/operator/team",
]);

function allowed(route: ProtectedRoute, who: Identity): boolean {
  if (who === "anonymous") return false;
  if (SURFACE_OF[who] !== route.surface) return false;
  if (route.surface === "admin") {
    return ADMIN_ACCESS[route.pattern]?.includes(who as Staff) ?? false;
  }
  if (route.surface === "operator") {
    return OPERATOR_ADMIN_ONLY.has(route.pattern)
      ? who === "operatorAdmin"
      : true;
  }
  return true;
}

// ---------------------------------------------------------------- sign-in

interface Accounts {
  state(who: Exclude<Identity, "anonymous">): Promise<StorageState>;
}
type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

type Credentials = { email: string; password: string };

/**
 * An approved operator organisation with an administrator and a staff member
 * holding every capability. The seeded operator is still waiting for review,
 * which would limit both to the application page, so each worker registers
 * its own and has operations approve it.
 */
async function operatorTeam(
  browser: Browser,
): Promise<{ operatorAdmin: Credentials; operatorStaff: Credentials }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await approvedOperator(page, browser);
  const me = await page.request.get(`${API_URL}me`);
  const operatorAdmin = {
    email: (await me.json()).data.email as string,
    password: PASSWORD,
  };

  const email = uniqueEmail("access-staff");
  const invited = await page.request.post(`${API_URL}operator/staff`, {
    headers: await csrf(page),
    data: {
      email,
      allAircraft: true,
      aircraftIds: [],
      capabilities: [
        "MANAGE_AIRCRAFT",
        "MANAGE_AVAILABILITY",
        "MANAGE_EMPTY_LEGS",
        "MANAGE_BOOKINGS",
      ],
    },
  });
  expect(invited.status()).toBe(201);
  await context.close();

  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  await staff.goto(await latestPasswordLink(staff.request, email));
  await staff
    .getByRole("textbox", { name: "New password", exact: true })
    .fill(PASSWORD);
  await staff
    .getByRole("textbox", { name: "Repeat the new password" })
    .fill(PASSWORD);
  await staff.getByRole("button", { name: "Set password" }).click();
  await staffContext.close();
  return { operatorAdmin, operatorStaff: { email, password: PASSWORD } };
}

async function signInState(
  browser: Browser,
  who: Exclude<Identity, "anonymous">,
  credentials: Credentials | Exclude<Identity, "anonymous">,
): Promise<StorageState> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, credentials as never);
  await expect(page).toHaveURL(HOME[SURFACE_OF[who]]);
  const state = await context.storageState();
  await context.close();
  return state;
}

/**
 * Each role signs in once per worker. The access token lasts 15 minutes and
 * a rotated refresh token cannot be shared between contexts, so a saved state
 * is replaced after 8.
 */
const test = base.extend<object, { accounts: Accounts }>({
  accounts: [
    async ({ browser }, use) => {
      let team: ReturnType<typeof operatorTeam> | undefined;
      const cache = new Map<
        string,
        { at: number; state: Promise<StorageState> }
      >();
      await use({
        state(who) {
          const hit = cache.get(who);
          if (hit && Date.now() - hit.at < 8 * 60_000) return hit.state;
          const state = (async () => {
            if (who === "operatorAdmin" || who === "operatorStaff") {
              team ??= operatorTeam(browser);
              return signInState(browser, who, (await team)[who]);
            }
            return signInState(browser, who, who);
          })();
          cache.set(who, { at: Date.now(), state });
          return state;
        },
      });
    },
    { scope: "worker", timeout: 120_000 },
  ],
});

// ----------------------------------------------------------------- visits

interface Visit {
  /** Path and query where the browser ended. */
  landed: string;
  heading: string;
  /** Rows of any table or grid, header excluded. */
  dataRows: number;
  /** Visible text of the main area, to say what the page showed. */
  main: string;
  /** Hrefs of the shell's navigation links. */
  nav: string[];
  /** Statuses of the browser's calls to the API's admin and operator routes. */
  api: string[];
  /** Statuses of every call to the API (`/api/v1`), the session's own included. */
  calls: string[];
  /** The page shows the app's error boundary or a load failure. */
  errored: boolean;
}

async function visit(
  browser: Browser,
  accounts: Accounts,
  who: Identity,
  path: string,
): Promise<Visit> {
  const context = await browser.newContext(
    who === "anonymous" ? {} : { storageState: await accounts.state(who) },
  );
  try {
    const page = await context.newPage();
    const api: string[] = [];
    const calls: string[] = [];
    page.on("response", (response) => {
      const url = new URL(response.url());
      const all = /\/api\/v1\/(.*)$/.exec(url.pathname);
      if (all) calls.push(`${response.status()} ${all[1]}`);
      const match = /\/api\/v1\/((?:admin|operator)\/.*)$/.exec(url.pathname);
      if (match) api.push(`${response.status()} ${match[1]}`);
    });
    await page.goto(path);
    await settle(page);
    const url = new URL(page.url());
    const landed = `${url.pathname}${url.search}`;
    return {
      landed,
      heading: (await page.getByRole("heading", { level: 1 }).count())
        ? ((await page
            .getByRole("heading", { level: 1 })
            .first()
            .textContent()) ?? "")
        : "",
      dataRows: await page
        .getByRole("main")
        .locator("tbody tr, [role='row']:not(:has([role='columnheader']))")
        .count(),
      main: (
        (await page
          .getByRole("main")
          .innerText()
          .catch(() => "")) ?? ""
      )
        .replace(/\s+/g, " ")
        .slice(0, 3000),
      nav: await portalNav(page),
      api,
      calls,
      errored: ERROR_SHOWN.test(
        (await page
          .locator("body")
          .innerText()
          .catch(() => "")) ?? "",
      ),
    };
  } finally {
    await context.close();
  }
}

/** The app's error boundary (`app/error.tsx`, `global-error.tsx`) and `LoadError`. */
const ERROR_SHOWN = /Something went wrong|We could not load/;

/** Waits until the page's data calls are done; a page that never settles fails the test. */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
}

async function portalNav(page: Page): Promise<string[]> {
  const navigation = page.getByRole("navigation", {
    name: /^(Admin|Operator) navigation$/,
  });
  if (!(await navigation.count())) return [];
  return navigation
    .first()
    .locator("a")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );
}

// ------------------------------------------------------------------ tests

/** The wording the portals use where a role has no use for a page (not "not found"). */
const NO_ACCESS =
  /do not have access|managed by|handled by|for your administrator/i;

/** What a page says to a role it does not admit (not "not found": a list can be empty). */
const DENIED_NOTE =
  /do not have access|managed by (super|finance|your)|for your administrator/i;

const refused = (call: string) => /^[45]\d\d /.test(call);

const ROUTES = protectedRoutes();

test.describe("access matrix", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop project only");

  test("the route list covers the known pages and every admin page has an access rule", () => {
    const patterns = ROUTES.map((route) => route.pattern);
    expect(patterns.length).toBeGreaterThan(50);
    for (const known of [
      "/admin",
      "/admin/users",
      "/admin/roles",
      "/admin/settlements",
      "/admin/audit-logs",
      "/admin/bookings/[reference]",
      "/operator",
      "/operator/team",
      "/operator/pricing",
      "/operator/air-ambulance/[reference]",
      "/account",
      "/account/trips/[reference]/pay",
      "/book/[searchId]/[resultId]",
    ]) {
      expect(patterns, known).toContain(known);
    }
    expect(patterns).not.toContain("/operator/register");
    const adminPages = ROUTES.filter((route) => route.surface === "admin").map(
      (route) => route.pattern,
    );
    expect(Object.keys(ADMIN_ACCESS).sort()).toEqual(adminPages);
    for (const pattern of OPERATOR_ADMIN_ONLY) {
      expect(patterns, pattern).toContain(pattern);
    }
  });

  for (const who of SIGNED_IN.filter((who) => who !== "customer")) {
    test(`${who}'s navigation links only to pages it may open`, async ({
      browser,
      accounts,
    }) => {
      const home = HOME[SURFACE_OF[who]];
      const { nav } = await visit(browser, accounts, who, home);
      expect(nav, "navigation links").toContain(home);
      for (const href of nav) {
        const route = ROUTES.find((candidate) => candidate.pattern === href);
        expect(route, `${href} is a known page`).toBeDefined();
        expect(allowed(route!, who), `${who} may open ${href}`).toBe(true);
      }
    });
  }

  for (const route of ROUTES) {
    test.describe(route.pattern, () => {
      test("signed out goes to sign-in and returns here", async ({
        browser,
        accounts,
      }) => {
        const result = await visit(browser, accounts, "anonymous", route.path);
        const landed = new URL(result.landed, "http://x");
        expect(landed.pathname).toBe("/login");
        expect(landed.searchParams.get("next")).toBe(route.path);
      });

      for (const who of SIGNED_IN) {
        const sameSurface = SURFACE_OF[who] === route.surface;
        const permitted = allowed(route, who);
        const title = !sameSurface
          ? `${who} is turned away to its own home`
          : permitted
            ? `${who} may open it`
            : `${who} sees no data`;
        test(title, async ({ browser, accounts }) => {
          const result = await visit(browser, accounts, who, route.path);
          const dynamic = route.pattern.includes("[");

          if (!sameSurface) {
            // Another surface's pages: the role's own home (requireRole).
            expect(result.landed).toBe(HOME[SURFACE_OF[who]]);
            return;
          }

          if (permitted) {
            expect(result.landed).toBe(route.path);
            expect(result.errored, "an error page is not an allowed page").toBe(
              false,
            );
            if (!dynamic) {
              expect(result.heading, "the page's heading").not.toBe("");
              // The page's own data calls all succeed for a role it admits.
              expect(result.api.filter(refused)).toEqual([]);
              if (route.surface === "customer") {
                expect(result.calls.filter(refused)).toEqual([]);
              }
              // ...and the page is the working page, not its no-access note.
              expect(result.main).not.toMatch(DENIED_NOTE);
            }
            return;
          }

          // A role in the surface that the page is not for: either sent to
          // the surface's home, or shown a page without data. Record which.
          expect([route.path, HOME[route.surface]]).toContain(result.landed);
          if (result.landed !== route.path) {
            test.info().annotations.push({
              type: "ui",
              description: `redirects to ${result.landed}`,
            });
            return;
          }
          expect(result.dataRows, "table rows").toBe(0);
          expect(
            result.api.filter(
              (call) => /^2\d\d /.test(call) && !/ operator\/me$/.test(call),
            ),
            "successful data calls",
          ).toEqual([]);
          // Positive evidence of refusal: the API answered 403, or the page
          // says so in its own words. "Not found" proves nothing: a missing
          // role gate on a placeholder id looks the same.
          const apiRefused = result.api.some((call) => call.startsWith("403 "));
          expect(
            apiRefused || NO_ACCESS.test(result.main),
            `the API's 403 or a no-access note (page said: ${result.main.slice(0, 120)})`,
          ).toBe(true);
          test.info().annotations.push({
            type: "ui",
            description: apiRefused
              ? "API refused (403), page shows its error"
              : "page shows its own no-access note, no data call",
          });
        });
      }
    });
  }
});
