import { expect, test, type Browser } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll } from "./support/api";
import { asStaff, csrf } from "./support/operators";
import { requestedTrip } from "./support/requests";

/**
 * The operator's bookings (M8-B): list, the names-only manifest, the two
 * status badges, and the operator's own moves. A booking is brought to
 * CONFIRMED by operations' override, as the API's tests bring one there;
 * its payment stays unpaid, which shows the two statuses are separate.
 */

async function confirmedTrip(
  page: Parameters<typeof requestedTrip>[0],
  browser: Browser,
) {
  const trip = await requestedTrip(page, browser, {
    priced: true,
    withPassenger: true,
  });
  const ops = await asStaff(browser);
  const moved = await ops.page.request.patch(
    `${API_URL}admin/bookings/${trip.reference}/status`,
    {
      headers: await csrf(ops.page),
      data: {
        status: "CONFIRMED",
        reason: "Confirmed with the operator by phone",
      },
    },
  );
  expect(moved.status()).toBe(200);
  await ops.context.close();
  return trip;
}

test("an operator opens a confirmed booking and marks it scheduled", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await confirmedTrip(page, browser);

  await page.goto("/operator/bookings");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 1, name: "Bookings" }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
  await main.getByRole("link", { name: trip.reference }).click();

  await expect(
    main.getByRole("heading", { level: 1, name: `Booking ${trip.reference}` }),
  ).toBeVisible();
  // Booking status and payment status are two badges.
  await expect(
    main.getByText("Confirmed", { exact: true }).first(),
  ).toBeVisible();
  await expect(main.getByText("Unpaid", { exact: true }).first()).toBeVisible();
  // The manifest is names only.
  await expect(
    main.getByRole("heading", { name: "Passenger manifest" }),
  ).toBeVisible();
  await expect(main.getByText("Kavya Ramaswamy")).toBeVisible();
  await expect(main.getByText(/passport|date of birth|1990/i)).toHaveCount(0);
  // The cancellation terms are drawn once.
  await expect(
    main.getByRole("heading", { name: "Cancellation terms in force" }),
  ).toHaveCount(1);
  await expect(main.getByText(/72 hours or more before departure/)).toHaveCount(
    1,
  );
  await expectNoSidewaysScroll(page);

  await main.getByRole("button", { name: "Mark scheduled" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Mark this trip scheduled?",
  });
  await dialog.getByRole("button", { name: "Mark scheduled" }).click();
  await expect(page.getByText("Trip marked scheduled").first()).toBeVisible();
  await expect(
    main.getByText("Scheduled", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Mark scheduled" }),
  ).toHaveCount(0);
});

test("an operator cancels a booking with a reason and the customer is charged nothing", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await confirmedTrip(page, browser);

  await page.goto(`/operator/bookings/${trip.reference}`);
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Cancel booking" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this booking?" });
  await expect(dialog.getByText(/is charged nothing/)).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Reason" })
    .fill("Aircraft grounded for maintenance");
  await dialog.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByText("Booking cancelled").first()).toBeVisible();
  await expect(
    main.getByText("Cancelled", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Cancel booking" }),
  ).toHaveCount(0);
});
