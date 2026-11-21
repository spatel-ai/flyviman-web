import { expect, test, type Page } from "@playwright/test";
import {
  API_URL,
  PASSWORD,
  latestCode,
  signIn,
  uniqueEmail,
  type AccountName,
} from "./support/api";

/**
 * Visual baseline: a screenshot of each main page, compared on every run so
 * a change in layout is seen. An intended change updates the baseline in the
 * same commit: `npm run test:e2e -- visual --update-snapshots`.
 *
 * Pages must not depend on what other tests add to the database. Public pages
 * are static. The account overview opens as a customer created for the shot
 * (no trips, so the same on any database). Dashboards show live figures: their
 * tile values and the dated heading are masked. Baselines are specific to the
 * operating system that produced them.
 */

interface Shot {
  name: string;
  path: string;
  account?: AccountName;
  /** Sign in as a customer registered for this shot, with nothing booked. */
  freshCustomer?: boolean;
  /** Only the light baseline is kept. */
  lightOnly?: boolean;
  /** Answers an API call with fixed figures, so live numbers never differ. */
  stub?: { url: string; data: unknown };
  /** Visible once the page has its data. */
  ready: (page: Page) => ReturnType<Page["getByRole"]>;
  /** Extra wait for data that loads after the first paint. */
  loaded?: (page: Page) => Promise<void>;
}

const ADMIN_OVERVIEW = {
  period: {
    from: "2026-01-01",
    to: "2026-01-30",
    timeZone: "Asia/Kolkata",
    startsAt: "2025-12-31T18:30:00.000Z",
    endsBefore: "2026-01-30T18:30:00.000Z",
  },
  inPeriod: {
    searches: 120,
    bookingRequests: 18,
    bookingsByStatus: [],
    airAmbulanceRequests: 2,
  },
  now: {
    openBookingRequests: 5,
    operatorsPendingReview: 3,
    airAmbulanceOpen: 1,
  },
  finance: {
    paymentsTaken: {
      count: 7,
      amounts: [{ currency: "INR", amountMinor: 12500000 }],
    },
    refundsDue: {
      count: 1,
      amounts: [{ currency: "INR", amountMinor: 250000 }],
    },
    confirmedBookingValue: [{ currency: "INR", amountMinor: 10000000 }],
    platformRevenue: [{ currency: "INR", amountMinor: 800000 }],
  },
};

const SHOTS: Shot[] = [
  {
    name: "home",
    path: "/",
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
  {
    name: "compare-home-v1",
    path: "/compare/home-v1",
    lightOnly: true,
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
  {
    name: "about",
    path: "/about",
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
  {
    name: "services",
    path: "/services",
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
  {
    name: "charter",
    path: "/charter",
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
  {
    name: "contact",
    path: "/contact",
    ready: (page) => page.getByRole("button", { name: "Send enquiry" }),
  },
  {
    name: "login",
    path: "/login",
    ready: (page) => page.getByRole("button", { name: "Sign in" }),
  },
  {
    name: "register",
    path: "/register",
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
  {
    name: "account",
    path: "/account",
    freshCustomer: true,
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
  {
    name: "account-profile",
    path: "/account/profile",
    account: "customer",
    ready: (page) => page.getByRole("heading", { level: 1 }),
    // The profile form fills in on the client after the heading appears.
    loaded: (page) =>
      expect(page.getByRole("textbox", { name: "First name" })).toHaveValue(
        "Local",
      ),
  },
  {
    name: "operator",
    path: "/operator",
    account: "operatorAdmin",
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
  {
    name: "admin",
    path: "/admin",
    account: "superAdmin",
    stub: { url: "**/admin/reports/overview*", data: ADMIN_OVERVIEW },
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
];

/** Live figures: dashboard tile values and the dated period heading. */
function masks(page: Page) {
  return [
    page.locator("[data-stat-value]"),
    page.getByRole("heading", { level: 2, name: / to \d/ }),
  ];
}

/** A newly registered, verified and signed-in customer with no bookings. */
async function freshCustomer(page: Page) {
  const email = uniqueEmail("visual");
  const register = await page.request.post(`${API_URL}auth/register`, {
    data: {
      firstName: "Asha",
      lastName: "Rao",
      email,
      password: PASSWORD,
      acceptTerms: true,
    },
  });
  expect(register.status()).toBe(202);
  const { verificationId } = (await register.json()).data;
  const verified = await page.request.post(`${API_URL}auth/email/verify`, {
    data: { verificationId, code: await latestCode(page.request, email) },
  });
  expect(verified.status()).toBe(200);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`visual baseline, ${scheme}`, () => {
    for (const shot of SHOTS) {
      if (shot.lightOnly && scheme === "dark") continue;
      test(`${shot.name} matches`, async ({ page }) => {
        // Dark is a stored choice, not the device preference.
        await page.addInitScript((value) => {
          localStorage.setItem("flyviman-theme", value);
        }, scheme);
        await page.emulateMedia({ reducedMotion: "reduce" });
        if (shot.stub) {
          await page.route(shot.stub.url, (route) =>
            route.fulfill({
              json: { data: shot.stub!.data, meta: { requestId: null } },
            }),
          );
        }
        if (shot.freshCustomer) {
          // Verifying the address signs the new customer in.
          await freshCustomer(page);
          await page.goto(shot.path);
        } else if (shot.account) {
          await signIn(page, shot.account, shot.path);
          await page.waitForURL((url) => !url.pathname.startsWith("/login"));
        } else {
          await page.goto(shot.path);
        }
        await expect(shot.ready(page)).toBeVisible();
        await shot.loaded?.(page);
        await page.evaluate(() => document.fonts.ready);
        // Photographs below the fold load lazily: bring each into view and
        // wait until every one has decoded, so the capture is never half-loaded.
        // Hidden photographs (such as the sign-in panel on phones) never load.
        // Both use the same test: a rendered box with width and height.
        for (const image of await page.locator("img:visible").all()) {
          await image.scrollIntoViewIfNeeded();
        }
        await expect
          .poll(() =>
            page.evaluate(() =>
              Array.from(document.images)
                .filter(
                  (image) => image.offsetWidth > 0 && image.offsetHeight > 0,
                )
                .every((image) => image.complete && image.naturalWidth > 0),
            ),
          )
          .toBe(true);
        await page.evaluate(() => window.scrollTo(0, 0));
        // A full-page capture would draw the fixed phone tab bar part-way
        // down the image: lay it out in the page for the capture only.
        await page.addStyleTag({
          content: 'nav[aria-label="Primary"] { position: static !important; }',
        });

        await expect(page).toHaveScreenshot(`${shot.name}-${scheme}.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.01,
          mask: masks(page),
        });
      });
    }
  });
}
