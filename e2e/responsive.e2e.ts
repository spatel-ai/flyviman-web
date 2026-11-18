import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./support/api";
import { TAB_BAR_HEIGHT } from "./support/phone";
import { fillAndSubmitSearch, seedOfferedAircraft } from "./support/search";

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

for (const path of ["/", "/search"]) {
  test(`Search clears the tab bar on a 375x667 phone, ${path}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(path);
    if (path === "/") {
      // The phone film (CR-2d): the card rises as the film ends, then holds.
      await page.evaluate(() => {
        const track = document.querySelector<HTMLElement>(".hero-track")!;
        const top = track.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + track.offsetHeight * 0.5 });
      });
      await expect(page.locator(".hero-card")).toHaveCSS("opacity", "1");
    }
    const search = page
      .locator(path === "/" ? ".hero-card" : "main")
      .getByRole("button", { name: "Search", exact: true })
      .first();
    await expect(search).toBeVisible();
    await expect
      .poll(async () => {
        const box = await search.boundingBox();
        return box ? box.y + box.height : Infinity;
      })
      .toBeLessThanOrEqual(667 - TAB_BAR_HEIGHT);
  });
}

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

for (const [width, height] of [
  [320, 568],
  [375, 667],
] as const) {
  test(`long values read in full at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/search");

    // A click before the page has hydrated does nothing: click again until
    // the airport list has opened.
    const bom = page.getByRole("option", { name: /BOM/ });
    await expect(async () => {
      if (!(await bom.isVisible())) {
        await page.getByRole("button", { name: /^From:/ }).click();
      }
      await expect(bom).toBeVisible({ timeout: 1000 });
    }).toPass();
    await bom.click();

    await page.getByRole("button", { name: /^Departure:/ }).click();
    await expect(page.getByRole("grid").first()).toBeVisible();
    await page
      .getByRole("grid")
      .first()
      .locator("button:not([disabled])")
      .nth(3)
      .click();
    await page.getByRole("button", { name: "11:00", exact: true }).click();
    await page.getByRole("button", { name: "Done" }).click();

    await page.getByRole("button", { name: /^Travellers:/ }).click();
    for (let count = 2; count < 12; count += 1) {
      await page.getByRole("button", { name: "One more passenger" }).click();
    }
    await page.getByRole("button", { name: "Done" }).click();
    await expect(
      page.getByRole("button", { name: "Travellers: 12 passengers" }),
    ).toBeVisible();

    for (const name of [/^From:/, /^Departure:/, /^Travellers:/]) {
      const value = page
        .getByRole("button", { name })
        .locator("[data-field-value]");
      await expect(value).toBeVisible();
      const fits = await value.evaluate(
        (el) => el.scrollWidth <= el.clientWidth,
      );
      expect(fits, `${name} value is clipped`).toBe(true);
    }
    await expect(
      page
        .getByRole("button", { name: /^From:/ })
        .locator("[data-field-value]"),
    ).toContainText("BOM");
    await expectNoSidewaysScroll(page);
  });
}

test("no sideways scroll at 320 wide on / and /search", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of ["/", "/search"]) {
    await page.goto(path);
    await expectNoSidewaysScroll(page);
  }
});

for (const [width, height] of [
  [375, 667],
  [744, 1133],
  [1440, 900],
] as const) {
  test(`Edit search keeps the card clear of the edges at ${width}x${height}`, async ({
    page,
    browser,
  }) => {
    test.slow();
    await seedOfferedAircraft(browser);
    await page.setViewportSize({ width, height });
    await page.goto("/search");
    await fillAndSubmitSearch(page);
    await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Edit search" }).click();
    await expect(card(page)).toBeVisible();
    const box = await card(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 16);
    await expectNoSidewaysScroll(page);
    console.log(
      `edit card ${width}: x=${Math.round(box!.x)} w=${Math.round(box!.width)} h=${Math.round(box!.height)}`,
    );
  });
}
