import { expect, test, type Page } from "@playwright/test";
import { signIn, type AccountName } from "./support/api";

/**
 * One title pattern (R21, W3-007, W2-005, W1-006, W1-022): "Page · Flyviman"
 * on the customer site, "Page · Operator · Flyviman" and
 * "Page · Admin · Flyviman" in the portals.
 */

const CUSTOMER: [string, string][] = [
  ["/", "Flyviman"],
  ["/about", "About us · Flyviman"],
  ["/contact", "Contact us · Flyviman"],
  ["/empty-legs", "Empty legs · Flyviman"],
  ["/legal/image-credits", "Image credits · Flyviman"],
  ["/login", "Sign in · Flyviman"],
  ["/register", "Create account · Flyviman"],
  ["/verify", "Verify your code · Flyviman"],
  ["/no-such-page", "Page not found · Flyviman"],
];

const ADMIN: [string, string][] = [
  ["/admin", "Dashboard · Admin · Flyviman"],
  ["/admin/bookings", "Bookings · Admin · Flyviman"],
  ["/admin/operators", "Operators · Admin · Flyviman"],
  ["/admin/audit-logs", "Audit log · Admin · Flyviman"],
  ["/admin/category-config", "Categories · Admin · Flyviman"],
  ["/admin/bookings/FLY-TEST", "Booking FLY-TEST · Admin · Flyviman"],
];

const OPERATOR: [string, string][] = [
  ["/operator/aircraft", "Fleet · Operator · Flyviman"],
  ["/operator/aircraft/new", "Add aircraft · Operator · Flyviman"],
  ["/operator/bookings", "Bookings · Operator · Flyviman"],
  ["/operator/requests/FLY-TEST", "Request FLY-TEST · Operator · Flyviman"],
];

const ACCOUNT: [string, string][] = [
  ["/account", "Overview · Flyviman"],
  ["/account/trips/FLY-TEST", "Trip FLY-TEST · Flyviman"],
];

async function expectTitles(page: Page, routes: [string, string][]) {
  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(page, path).toHaveTitle(title);
  }
}

test("customer and sign-in pages follow 'Page · Flyviman'", async ({
  page,
}) => {
  await expectTitles(page, CUSTOMER);
});

for (const [name, account, routes] of [
  ["admin", "ops", ADMIN],
  ["operator", "operatorAdmin", OPERATOR],
  ["customer account", "customer", ACCOUNT],
] as [string, AccountName, [string, string][]][]) {
  test(`${name} pages follow the title pattern`, async ({ page }) => {
    await signIn(page, account, routes[0][0]);
    await expect(page).toHaveURL(new RegExp(`${routes[0][0]}$`));
    await expectTitles(page, routes);
  });
}
