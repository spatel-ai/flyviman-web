import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll, signIn } from "./support/api";
import {
  expectBarAboveTabBar,
  expectNotCovered,
  expectPageEndClear,
} from "./support/phone";
import { fillAndSubmitSearch, seedOfferedAircraft } from "./support/search";
import { SIGNED_IN_PREFIXES, allRoutes } from "./support/routes";

/** The search journey from the landing page, phone and desktop (M12). */
test("the landing page's charter card leads to a labelled result and an enquiry", async ({
  page,
  browser,
  isMobile,
}) => {
  test.slow();
  await seedOfferedAircraft(browser);

  await page.goto("/");
  // The film plays with the scroll; at its end the charter card has risen.
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight }),
  );
  await expect(page.locator(".hero-card")).toHaveCSS("opacity", "1");
  // The charter card is the landing's search, with charter chosen.
  await expect(page.getByRole("tab", { name: /^Private jet/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await fillAndSubmitSearch(page);

  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}$/);
  const results = page.getByRole("list", { name: "Aircraft found" });
  await expect(results.getByRole("listitem").first()).toBeVisible();
  // Every price on a result is labelled (rule 1).
  await expect(
    results
      .getByText("Estimate", { exact: true })
      .or(results.getByText("Price on request"))
      .first(),
  ).toBeVisible();

  await results
    .getByRole("link", { name: /^Details:/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
  // On a phone the action sits in a sticky bar above the tab bar; on a
  // desktop it is in the page. Either way the label and the note are shown
  // beside it (rules 1, 9).
  const scope = isMobile
    ? page.getByRole("region", { name: "Request this aircraft" })
    : page.locator("main");
  if (isMobile) await expectBarAboveTabBar(page, scope);
  await expect(
    scope
      .getByText("Estimate", { exact: true })
      .or(scope.getByText("Price on request"))
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    scope
      .getByText(/cancellation terms/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();

  await scope
    .getByRole("link", { name: "Request this aircraft" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/contact\?topic=PRIVATE_CHARTER/);
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(
    /I would like to request the .+ Search reference/,
  );
});

/**
 * The customer site on a phone (M12, CR-2): the tab bar and a sticky action
 * bar never cover content. Phones only, at 375 by 812.
 */
test.describe("phone layout", () => {
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
});
