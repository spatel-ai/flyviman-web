import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./support/api";
import { TAB_BAR_HEIGHT } from "./support/phone";

/**
 * The charter booking card suits every screen (M12, CR-2c). It sets its own
 * viewports, so it runs under the desktop project only.
 */
const VIEWPORTS = [
  [375, 667],
  [393, 852],
  [412, 915],
  [744, 1133],
  [820, 1180],
  [1180, 820],
  [1440, 900],
] as const;

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "sets its own viewports");
});

const card = (page: import("@playwright/test").Page) =>
  page
    .getByRole("tablist", { name: "What would you like to fly?" })
    .locator("..");

for (const [width, height] of VIEWPORTS) {
  test(`the card fits ${width}x${height} on /search`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/search");
    const box = await card(page).boundingBox();
    expect(box).not.toBeNull();
    if (width < 640) expect(box!.height).toBeLessThanOrEqual(460);
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 16);
    await expectNoSidewaysScroll(page);
    console.log(`card ${width}x${height}: ${Math.round(box!.height)} px tall`);
  });
}

test("Search is in view without scrolling on a 375x812 phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/search");
  const search = page.getByRole("button", { name: "Search", exact: true });
  const box = await search.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(812 - TAB_BAR_HEIGHT);
});

test("on the landing page Search clears the tab bar once the card is in view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight }),
  );
  await expect(page.locator(".hero-card")).toHaveCSS("opacity", "1");
  const search = page
    .locator(".hero-card")
    .getByRole("button", { name: "Search", exact: true });
  await expect
    .poll(async () => {
      const box = await search.boundingBox();
      return box ? box.y + box.height : Infinity;
    })
    .toBeLessThanOrEqual(812 - TAB_BAR_HEIGHT);
});
