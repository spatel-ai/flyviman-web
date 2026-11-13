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
 * The full-page shots above use reduced motion, so the showpiece appears as
 * a plain section. This one captures the film part way through a scene
 * change (blinds half closed) on a wide screen.
 */
for (const scheme of ["light", "dark"] as const) {
  test(`home showpiece, mid change, ${scheme}, matches`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "The film plays on wide screens.",
    );
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator(".scroll-film")).toHaveAttribute(
      "data-film",
      "on",
    );
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const el = document.querySelector(".scroll-film") as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const start = top - 48;
      const end = top + el.offsetHeight - window.innerHeight;
      // Just before the first change: the private charter scene, blinds
      // about half closed.
      window.scrollTo({ top: start + (end - start) * (1 / 3 - 0.05) });
    });
    await expect(
      page.locator('.scroll-film__scene[data-film-active="true"] h3'),
    ).toHaveText("Private charter");
    await expect
      .poll(() =>
        page
          .locator('.scroll-film__scene[data-film-active="true"] img')
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
    await expect(page).toHaveScreenshot(`home-showpiece-${scheme}.png`, {
      animations: "allow",
      maxDiffPixelRatio: 0.01,
    });
  });
}
