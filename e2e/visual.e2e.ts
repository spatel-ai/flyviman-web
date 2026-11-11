import { expect, test, type Page } from "@playwright/test";
import { signIn, type AccountName } from "./support/api";

/**
 * Visual baseline: a screenshot of each main page, compared on every run so
 * a change in layout is seen. An intended change updates the baseline in the
 * same commit: `npm run test:e2e -- visual --update-snapshots`.
 *
 * Only pages whose content is fixed by the seed are covered; lists that other
 * tests add to would differ from run to run. Baselines are specific to the
 * operating system that produced them.
 */

interface Shot {
  name: string;
  path: string;
  account?: AccountName;
  /** Visible once the page has its data. */
  ready: (page: Page) => ReturnType<Page["getByRole"]>;
}

const SHOTS: Shot[] = [
  {
    name: "home",
    path: "/",
    ready: (page) => page.getByRole("heading", { level: 1 }),
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
    account: "customer",
    ready: (page) => page.getByRole("heading", { level: 1 }),
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
    ready: (page) => page.getByRole("heading", { level: 1 }),
  },
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`visual baseline, ${scheme}`, () => {
    for (const shot of SHOTS) {
      test(`${shot.name} matches`, async ({ page }) => {
        await page.emulateMedia({
          colorScheme: scheme,
          reducedMotion: "reduce",
        });
        if (shot.account) {
          await signIn(page, shot.account, shot.path);
          await page.waitForURL((url) => !url.pathname.startsWith("/login"));
        } else {
          await page.goto(shot.path);
        }
        await expect(shot.ready(page)).toBeVisible();
        await page.evaluate(() => document.fonts.ready);

        await expect(page).toHaveScreenshot(`${shot.name}-${scheme}.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  });
}
