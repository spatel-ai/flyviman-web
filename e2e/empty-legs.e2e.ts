import { expect, test } from "@playwright/test";
import { signIn } from "./support/api";
import { approvedAircraft } from "./support/operators";

/**
 * Empty legs (M7 web). The pages that need the empty-leg API are marked
 * `fixme` until it is merged (W2-1); the checks that do not need it run now.
 */

test("the customer page names itself and offers the filters", async ({
  page,
}) => {
  await page.goto("/empty-legs");
  await expect(
    page.getByRole("heading", { level: 1, name: "Empty legs" }),
  ).toBeVisible();
  const filters = page.getByRole("form", { name: "Filter empty legs" });
  await expect(filters.getByLabel("Earliest day")).toBeVisible();
  await expect(filters.getByLabel("Passengers")).toBeVisible();
  await expect(
    filters.getByRole("button", { name: "Show offers" }),
  ).toBeVisible();
});

test("the filters are kept in the address", async ({ page }) => {
  await page.goto("/empty-legs");
  await page.getByLabel("Passengers").fill("3");
  await page.getByLabel("Highest price (INR)").fill("250000");
  await page.getByRole("button", { name: "Show offers" }).click();
  await expect(page).toHaveURL(/passengers=3/);
  await expect(page).toHaveURL(/maxPrice=250000/);
});

test("Empty legs is in the More menu", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await expect(
    page
      .getByRole("menuitem", { name: "Empty legs", exact: true })
      .or(page.getByRole("link", { name: "Empty legs", exact: true })),
  ).toHaveAttribute("href", "/empty-legs");
});

test("operations see the queue in the admin navigation", async ({ page }) => {
  await signIn(page, "ops", "/admin/empty-legs");
  await expect(
    page.getByRole("heading", { level: 1, name: "Empty legs" }),
  ).toBeVisible();
});

test.fixme("an offer goes from draft to approved and shows to customers, who can ask about it and follow it", async ({
  page,
  browser,
}) => {
  // Needs W2-1. Journey: an operator with an approved aircraft saves a draft
  // at /operator/empty-legs/new, publishes it; operations approve it at
  // /admin/empty-legs; /empty-legs lists it with its price type; the detail
  // page shows the conditions before "Ask about this flight" (an enquiry, no
  // booking); a signed-in customer toggles "Notify me of changes".
  void [page, browser, approvedAircraft];
});

test.fixme("operations reject an offer with a reason the operator sees, and an operator withdraws a published offer", async ({
  page,
}) => {
  // Needs W2-1.
  void page;
});
