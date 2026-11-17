import { expect, type Locator, type Page } from "@playwright/test";

/** The phone tab bar's height: h-14 (3.5rem = 56 px); no inset in a test browser. */
export const TAB_BAR_HEIGHT = 56;

/** Whether the element is what a finger would hit at its own centre. */
export async function expectNotCovered(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return hit !== null && element.contains(hit);
      }),
    )
    .toBe(true);
}

/** At the foot of the page, its last content is clear of the tab bar. */
export async function expectPageEndClear(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const last = page.locator("footer.site-footer").getByText(/©/).last();
  await expectNotCovered(last);
}

/** The sticky action bar sits directly above the tab bar, not over it. */
export async function expectBarAboveTabBar(page: Page, bar: Locator) {
  await expect(bar).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Primary" });
  await expect(tabs).toBeVisible();
  await expect
    .poll(async () => {
      const a = await bar.boundingBox();
      const b = await tabs.boundingBox();
      if (!a || !b) return false;
      return a.y + a.height <= b.y + 1 && b.y - (a.y + a.height) < 4;
    })
    .toBe(true);
}
