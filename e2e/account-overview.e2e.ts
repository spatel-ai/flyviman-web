import { expect, test } from "@playwright/test";
import {
  listedJet,
  newCustomer,
  requestThroughApi,
  searchFor,
} from "./support/bookings";

/** The account home is the Overview; the profile has its own page (D-207). */

test("a new customer sees nothing in progress and a link to search", async ({
  browser,
}) => {
  const { page } = await newCustomer(browser);
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
  await expect(page.getByText("Nothing in progress")).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Search flights" }),
  ).toHaveAttribute("href", "/search");
});

test("a customer with a booking request sees it among the open requests", async ({
  browser,
}) => {
  test.slow();
  const { operator, aircraftId } = await listedJet(browser, true);
  const { page, passengerId } = await newCustomer(browser);
  await requestThroughApi(page, await searchFor(page, aircraftId), passengerId);

  await page.goto("/account");
  const main = page.getByRole("main");
  await expect(main.getByText("Nothing in progress")).toHaveCount(0);
  await expect(main.getByRole("link", { name: /Open requests/ })).toContainText(
    "1",
  );
  await operator.close();
});

test("the profile is at /account/profile", async ({ browser }) => {
  const { page } = await newCustomer(browser);
  await page.goto("/account/profile");
  await expect(
    page.getByRole("heading", { level: 1, name: "Profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Delete my account" }),
  ).toBeVisible();
});

test("on a 390 px screen the current account tab is scrolled into view and the strip fades where tabs are hidden", async ({
  browser,
}) => {
  const { page } = await newCustomer(browser);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/account/air-ambulance");
  const current = page
    .getByRole("navigation", { name: "Account" })
    .getByRole("link", { name: "Air ambulance" });
  await expect(current).toHaveAttribute("aria-current", "page");
  await expect(async () => {
    const box = await current.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }).toPass();
  // Tabs are hidden on the left, none on the right.
  await expect(page.getByTestId("account-nav-fade-start")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.getByTestId("account-nav-fade-end")).toHaveCSS(
    "opacity",
    "0",
  );
});
