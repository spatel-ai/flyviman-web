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
  /** Extra wait for data that loads after the first paint. */
  loaded?: (page: Page) => Promise<void>;
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

        await expect(page).toHaveScreenshot(`${shot.name}-${scheme}.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  });
}

/**
 * The full-page shots above use reduced motion, so they show the story
 * section's final state. This one captures the pinned story itself, halfway
 * through, on a wide screen (it is a plain section on phones).
 */
for (const scheme of ["light", "dark"] as const) {
  test(`home story, halfway, ${scheme}, matches`, async ({ page }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "The story is pinned only on wide screens.",
    );
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const el = document.querySelector(".route-story") as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + (el.offsetHeight - window.innerHeight) / 2,
      });
    });
    // Let the reveals inside the pinned stage finish rising in.
    await expect(
      page.locator('.route-story [data-reveal="waiting"]'),
    ).toHaveCount(0);
    await page.waitForTimeout(1000);
    // "allow": the default would fast-forward the scroll-driven animations
    // to their end, a frame the visitor never sees.
    await expect(page).toHaveScreenshot(`home-story-${scheme}.png`, {
      animations: "allow",
      maxDiffPixelRatio: 0.01,
    });
  });
}
