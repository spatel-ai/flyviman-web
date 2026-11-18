import { expect, test, type Page } from "@playwright/test";

/**
 * Screen matrix: the home page and Search at the screen sizes people use,
 * viewport-sized so the first screen is what is compared. Still hero (reduced
 * motion) so the shot is steady. Run in the desktop project only: the size is
 * set here, not by a device profile. Baselines are specific to the operating
 * system that produced them.
 */

const SIZES = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-15", width: 393, height: 852 },
  { name: "phone-landscape", width: 852, height: 393 },
  { name: "ipad-mini", width: 744, height: 1133 },
  { name: "ipad-air", width: 820, height: 1180 },
  { name: "ipad-landscape", width: 1180, height: 820 },
  { name: "laptop", width: 1440, height: 900 },
  { name: "desktop", width: 1920, height: 1080 },
];
const DARK = new Set(["iphone-15", "laptop"]);
const FULL_PAGE = new Set(["iphone-15", "laptop"]);

const PAGES = [
  { name: "home", path: "/" },
  { name: "search", path: "/search" },
];

async function settle(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator("img:visible").all()) {
    await image.scrollIntoViewIfNeeded();
  }
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.images)
          .filter((i) => i.offsetWidth > 0 && i.offsetHeight > 0)
          .every((i) => i.complete && i.naturalWidth > 0),
      ),
    )
    .toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.describe("screen matrix", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Sizes are set here, desktop project only",
  );

  for (const size of SIZES) {
    for (const scheme of ["light", "dark"] as const) {
      if (scheme === "dark" && !DARK.has(size.name)) continue;
      for (const pg of PAGES) {
        test(`${pg.name} ${size.name} ${scheme}`, async ({ page }) => {
          await page.setViewportSize({
            width: size.width,
            height: size.height,
          });
          await page.addInitScript((value) => {
            localStorage.setItem("flyviman-theme", value);
          }, scheme);
          await page.emulateMedia({ reducedMotion: "reduce" });
          await page.goto(pg.path);
          await settle(page);
          const options = {
            animations: "disabled",
            maxDiffPixelRatio: 0.01,
          } as const;
          await expect(page).toHaveScreenshot(
            `${pg.name}-${size.name}-${scheme}.png`,
            options,
          );
          if (pg.name === "home" && FULL_PAGE.has(size.name)) {
            // A full-page capture would draw the fixed phone tab bar part-way
            // down the image: lay it out in the page for the capture only.
            await page.addStyleTag({
              content:
                'nav[aria-label="Primary"] { position: static !important; }',
            });
            await expect(page).toHaveScreenshot(
              `${pg.name}-${size.name}-${scheme}-full.png`,
              { ...options, fullPage: true },
            );
          }
        });
      }
    }
  }
});
