import { expect, test } from "@playwright/test";
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
