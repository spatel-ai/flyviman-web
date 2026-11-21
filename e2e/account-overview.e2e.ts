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
