import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll, signIn } from "./support/api";
import { requestedTrip } from "./support/requests";

/**
 * The admin portal's bookings (M8, W3-8): search, open, assign, note,
 * override with a reason and answer a change request, as operations; read
 * only, without passenger details, as finance. Each test makes its own
 * operator, aircraft and customer through the API.
 */

test("operations search a booking, open it, take it, add a note and override its status", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await requestedTrip(await browser.newPage(), browser, {
    priced: true,
    withPassenger: true,
  });

  await signIn(page, "ops", "/admin/bookings");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 1, name: "Bookings" }),
  ).toBeVisible();
  await main.getByRole("textbox", { name: "Search" }).fill(trip.reference);
  await main.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${trip.reference}`));
  // Booking and payment status are two badges; the price says what it is.
  const row = main.getByRole("link", { name: trip.reference });
  await expect(row).toBeVisible();
  await expect(main.getByText("Awaiting operator").first()).toBeVisible();
  await expect(main.getByText("Unpaid").first()).toBeVisible();
  await expect(main.getByText("Estimate").first()).toBeVisible();
  await expectNoSidewaysScroll(page);

  await row.click();
  await expect(
    main.getByRole("heading", { level: 1, name: `Booking ${trip.reference}` }),
  ).toBeVisible();
  await expect(main.getByText("Kavya Ramaswamy")).toBeVisible();
  await expect(main.getByText("Paid but not confirmed")).toHaveCount(0);
  await expectNoSidewaysScroll(page);

  await main.getByRole("button", { name: "Assign to me" }).click();
  await expect(page.getByText("Owner set").first()).toBeVisible();
  await expect(main.getByRole("button", { name: "Assign to me" })).toHaveCount(
    0,
  );

  await main
    .getByRole("textbox", { name: "Add a note" })
    .fill("Called the crew");
  await main.getByRole("button", { name: "Add note" }).click();
  await expect(main.getByText("Called the crew")).toBeVisible();

  await main.getByRole("button", { name: "Override status" }).click();
  const dialog = page.getByRole("dialog", { name: "Override the status" });
  // A status and a reason are both required.
  await dialog.getByRole("button", { name: "Change status" }).click();
  await expect(dialog.getByText("Choose the new status.")).toBeVisible();
  await expect(
    dialog.getByText("Give a reason of at least 3 characters."),
  ).toBeVisible();
  await dialog.getByRole("combobox", { name: "New status" }).click();
  await page.getByRole("option", { name: "Operator unavailable" }).click();
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Operator phoned");
  await dialog.getByRole("button", { name: "Change status" }).click();
  await expect(page.getByText("Status changed").first()).toBeVisible();
  await expect(main.getByText("Operator unavailable").first()).toBeVisible();
  await expect(main.getByText("Reason: Operator phoned")).toBeVisible();
});

test("operations answer a change request from the booking and from the list", async ({
  page,
  browser,
}) => {
  test.slow();
  const first = await requestedTrip(await browser.newPage(), browser, {
    priced: true,
    changeRequest: "Please move the flight to the morning",
  });
  await signIn(page, "ops", `/admin/bookings/${first.reference}`);
  const main = page.getByRole("main");
  await expect(
    main.getByText("Please move the flight to the morning"),
  ).toBeVisible();
  await main.getByRole("button", { name: "Approve" }).click();
  const dialog = page.getByRole("dialog", { name: "Approve this request?" });
  // The customer sees the note, so it is required.
  await dialog.getByRole("button", { name: "Approve" }).click();
  await expect(
    dialog.getByText("Write a note for the customer."),
  ).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Note to the customer" })
    .fill("Morning slot is free");
  await dialog.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Request approved").first()).toBeVisible();
  await expect(main.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(
    main.getByText("Note to the customer: Morning slot is free"),
  ).toBeVisible();

  const second = await requestedTrip(await browser.newPage(), browser, {
    priced: true,
    changeRequest: "Add a stop in Pune please",
  });
  await page.goto("/admin/change-requests");
  await expect(
    main.getByRole("heading", { level: 1, name: "Change requests" }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: second.reference }),
  ).toBeVisible();
  // The answered one has left the open list.
  await expect(main.getByRole("link", { name: first.reference })).toHaveCount(
    0,
  );
  const card = main
    .getByText("Add a stop in Pune please")
    .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
  await card.getByRole("button", { name: "Decline" }).click();
  const decline = page.getByRole("dialog", { name: "Decline this request?" });
  await decline
    .getByRole("textbox", { name: "Note to the customer" })
    .fill("We cannot add a stop");
  await decline.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText("Request declined").first()).toBeVisible();
  await expect(main.getByRole("link", { name: second.reference })).toHaveCount(
    0,
  );
});

test("finance read a booking without passenger details or actions", async ({
  page,
  browser,
  isMobile,
}) => {
  test.slow();
  const trip = await requestedTrip(await browser.newPage(), browser, {
    priced: true,
    withPassenger: true,
    changeRequest: "Please move the flight to the morning",
  });

  await signIn(page, "finance", `/admin/bookings?q=${trip.reference}`);
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: trip.reference })).toBeVisible();
  await main.getByRole("link", { name: trip.reference }).click();
  await expect(
    main.getByRole("heading", { level: 1, name: `Booking ${trip.reference}` }),
  ).toBeVisible();
  await expect(
    main.getByText("Passenger details are not shown to your role."),
  ).toBeVisible();
  await expect(main.getByText("Kavya")).toHaveCount(0);
  await expect(main.getByText("Please move the flight")).toHaveCount(0);
  await expect(
    main.getByText("The customer's text is not shown to your role."),
  ).toBeVisible();
  for (const name of [
    "Override status",
    "Assign to me",
    "Add note",
    "Approve",
  ]) {
    await expect(main.getByRole("button", { name })).toHaveCount(0);
  }
  await expect(
    main.getByRole("heading", { name: "Internal notes" }),
  ).toHaveCount(0);

  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole("link", { name: "Bookings" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Change requests" })).toHaveCount(
    0,
  );
});

test("a booking that does not exist says so", async ({ page }) => {
  await signIn(page, "ops", "/admin");
  await expect(page).toHaveURL("/admin");
  await page.goto("/admin/bookings/FLY-BK-ZZZZZZ");
  await expect(page.getByText("Booking not found")).toBeVisible();
});
