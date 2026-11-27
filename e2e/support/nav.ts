import { expect, type Locator } from "@playwright/test";

/**
 * Opens a category of the portal navigation (a sidebar, or the drawer on a
 * phone) so its links can be clicked. Does nothing when it is already open, or
 * when the role has one category only and the navigation is a flat list.
 */
export async function openNav(nav: Locator, category: string) {
  const button = nav.getByRole("button", {
    name: new RegExp(`^${category}`),
  });
  // The navigation is there once its first link is; only then can "no button"
  // mean a flat list.
  await expect(nav.getByRole("link").first()).toBeVisible();
  if ((await button.count()) === 0) return;
  // A click before the page is interactive is lost: retry until it took.
  await expect(async () => {
    if ((await button.getAttribute("aria-expanded")) !== "true") {
      await button.click();
    }
    await expect(button).toHaveAttribute("aria-expanded", "true", {
      timeout: 1000,
    });
  }).toPass();
}
