import { expect, test } from "@playwright/test";
import { newCustomer } from "./support/bookings";
import { requestedTrip } from "./support/requests";

/**
 * In-app notifications in the operator portal (M10, W4-8): a customer's
 * request tells the operator, and the message links to the request.
 */
test("an operator is told of a new request and follows the link to it", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await requestedTrip(page, browser, { priced: true });

  await page.goto("/operator/notifications");

  const list = page.getByRole("list", { name: "Notifications" });
  const item = list.getByRole("listitem").filter({ hasText: trip.reference });
  await expect(
    item.getByRole("heading", {
      name: `New booking request ${trip.reference}`,
    }),
  ).toBeVisible();
  await item.getByRole("link", { name: "View" }).click();
  await expect(page).toHaveURL(`/operator/requests/${trip.reference}`);
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 1, name: `Request ${trip.reference}` }),
  ).toBeVisible();
});

test("an old air ambulance notification link redirects to the customer's request", async ({
  request,
}) => {
  const response = await request.get("/air-ambulance/requests/FLY-AA-TEST01", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toBe(
    "/account/air-ambulance/FLY-AA-TEST01",
  );
});

test("a customer sees the unread count, and marks everything read at once", async ({
  browser,
}) => {
  const { page } = await newCustomer(browser);
  await page.goto("/account/notifications");

  // The welcome message is unread: the entry and the menu carry the count.
  const tab = page
    .getByRole("navigation", { name: "Account" })
    .getByRole("link", { name: "Notifications, 1 unread" });
  await expect(tab).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Account menu, 1 unread" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Account" })
      .getByRole("link", { name: "Notifications", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mark all as read" }),
  ).toHaveCount(0);

  // The account menu also offers Trips and Air ambulance.
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Trips" })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Air ambulance" }),
  ).toBeVisible();
});
