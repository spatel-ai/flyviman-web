import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll, signIn } from "./support/api";
import {
  expectBarAboveTabBar,
  expectNotCovered,
  expectPageEndClear,
} from "./support/phone";
import { SIGNED_IN_PREFIXES, allRoutes } from "./support/routes";

/**
 * The customer site on a phone (M12, CR-2): the tab bar and a sticky action
 * bar never cover content. Phones only, at 375 by 812.
 */
test.skip(
  ({ isMobile }) => !isMobile,
  "Phone layout; the desktop project has no tab bar",
);
test.use({ viewport: { width: 375, height: 812 } });

/** The sign-in pages are a separate, bare layout with no tab bar. */
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify",
];

const CUSTOMER_ROUTES = [
  ...allRoutes().filter(
    (route) =>
      !/\[/.test(route) &&
      route !== "/" &&
      !AUTH_ROUTES.includes(route) &&
      !route.startsWith("/api") &&
      !SIGNED_IN_PREFIXES.some(
        (prefix) => route === prefix || route.startsWith(`${prefix}/`),
      ) &&
      !route.startsWith("/auth") &&
      !route.startsWith("/_"),
  ),
  "/",
];

for (const route of CUSTOMER_ROUTES) {
  test(`${route}: the foot of the page is clear of the tab bar`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectPageEndClear(page);
  });
}

test("an aircraft for sale keeps its enquiry action above the tab bar", async ({
  page,
}) => {
  await page.goto("/aircraft-sales/gulfstream-g550");
  const bar = page.getByRole("region", {
    name: "Enquire about this aircraft",
  });
  await expectBarAboveTabBar(page, bar);
  // The action stays on screen while the specification scrolls.
  await page.evaluate(() => window.scrollTo(0, 300));
  await expectBarAboveTabBar(page, bar);
  await expectNotCovered(bar.getByRole("link", { name: "Enquire now" }));
  // At the end it rests in the page, so the footer is not covered.
  await expectPageEndClear(page);
});

test("the enquiry form's submit button can be reached above the tab bar", async ({
  page,
}) => {
  await page.goto("/contact");
  await expectNotCovered(page.getByRole("button", { name: "Send enquiry" }));
});

test("the account pages end clear of the tab bar", async ({ page }) => {
  await signIn(page, "customer", "/account");
  await expect(page).toHaveURL(/\/account/);
  await expectNoSidewaysScroll(page);
  await expectPageEndClear(page);
});
