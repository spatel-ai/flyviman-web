import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./support/api";
import { requestedTrip } from "./support/requests";

/**
 * The operator's request inbox (M8, W3-7): see a customer's request, accept,
 * reject, ask a question or send a quote. Each test makes its own operator,
 * aircraft and customer, through the API.
 */

test("an operator sees a request with its special requests, accepts it and adds an internal note", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await requestedTrip(page, browser, {
    priced: true,
    specialRequests: "Vegetarian catering please",
  });

  await page.goto("/operator/requests");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 1, name: "Requests" }),
  ).toBeVisible();
  const row = main.getByRole("listitem").filter({ hasText: trip.reference });
  await expect(row.getByText("Awaiting operator")).toBeVisible();
  // A proposed price is an estimate, and says so.
  await expect(row.getByText("Estimate").first()).toBeVisible();
  await expect(row.getByText(/left/)).toBeVisible();
  await expectNoSidewaysScroll(page);

  await row.getByRole("link", { name: trip.reference }).click();
  await expect(
    main.getByRole("heading", { level: 1, name: `Request ${trip.reference}` }),
  ).toBeVisible();
  await expect(main.getByText("Vegetarian catering please")).toBeVisible();
  await expect(main.getByText(/^Departs /).first()).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Accept request" }).click();
  // Accepting at the proposed price confirms it and waits for the customer's
  // payment (D-211): the status says so, and the price is labelled confirmed.
  await expect(
    main.getByText("Awaiting payment", { exact: true }).first(),
  ).toBeVisible();
  await expect(main.getByText("Confirmed price").first()).toBeVisible();
  // Once answered: the field is the agreed price and no answer-by hold shows.
  await expect(main.getByText("Agreed price", { exact: true })).toBeVisible();
  await expect(main.getByText("Hold on your aircraft")).toHaveCount(0);
  await expect(main.getByText(/Flyviman's estimate from/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Accept", exact: true }),
  ).toHaveCount(0);

  await main.getByRole("textbox", { name: "Add a note" }).fill("Crew briefed");
  await main.getByRole("button", { name: "Add note" }).click();
  await expect(main.getByText("Crew briefed")).toBeVisible();
});

test("an operator rejects a request with a reason", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await requestedTrip(page, browser, { priced: true });
  await page.goto(`/operator/requests/${trip.reference}`);
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Reject this request?" });
  // A reason is required.
  await expect(
    dialog.getByRole("button", { name: "Reject request" }),
  ).toBeDisabled();
  await dialog
    .getByRole("textbox", { name: "Reason" })
    .fill("Aircraft in maintenance");
  await dialog.getByRole("button", { name: "Reject request" }).click();
  await expect(
    page.getByRole("main").getByText("Operator unavailable").first(),
  ).toBeVisible();

  // It has left the waiting list and is under "Not taken".
  await page.goto("/operator/requests");
  await expect(
    page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ hasText: trip.reference }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Not taken" }).click();
  await expect(
    page.getByRole("main").getByRole("link", { name: trip.reference }),
  ).toBeVisible();
});

test("a request priced on request is answered with a quote, which can be revised", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await requestedTrip(page, browser, { priced: false });
  await page.goto("/operator/requests");
  const main = page.getByRole("main");
  const row = main.getByRole("listitem").filter({ hasText: trip.reference });
  await expect(row.getByText("Price on request")).toBeVisible();

  await row.getByRole("link", { name: trip.reference }).click();
  // Nothing to accept: there is no proposed price.
  await expect(
    page.getByRole("button", { name: "Accept", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Send a quote" }).click();
  const dialog = page.getByRole("dialog", { name: "Send a quote" });
  await dialog.getByRole("button", { name: "Send quote" }).click();
  await expect(dialog.getByText("Enter your price")).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Your price (₹)" })
    .fill("1,80,000");
  await dialog.getByRole("button", { name: "Send quote" }).click();
  await expect(main.getByText("Sent, waiting for the customer")).toBeVisible();
  await expect(main.getByText("₹1,80,000").first()).toBeVisible();

  // The first quote is out: revising replaces it.
  await page.getByRole("button", { name: "Revise quote" }).click();
  const revise = page.getByRole("dialog", { name: "Revise your quote" });
  await expect(
    revise.getByRole("textbox", { name: "Your price (₹)" }),
  ).toHaveValue("180000");
  await revise
    .getByRole("textbox", { name: "Your price (₹)" })
    .fill("1,75,000");
  await revise.getByRole("button", { name: "Send revised quote" }).click();
  await expect(main.getByText("Replaced by a newer quote")).toBeVisible();
  await expect(main.getByText("₹1,75,000").first()).toBeVisible();
});

test("an operator asks the customer a question", async ({ page, browser }) => {
  test.slow();
  const trip = await requestedTrip(page, browser, { priced: true });
  await page.goto(`/operator/requests/${trip.reference}`);
  await page.getByRole("button", { name: "Ask a question" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Ask the customer a question",
  });
  await dialog
    .getByRole("textbox", { name: "Your question" })
    .fill("Is the luggage over 20 kg?");
  await dialog.getByRole("button", { name: "Send question" }).click();
  const main = page.getByRole("main");
  await expect(main.getByText("Clarification needed").first()).toBeVisible();
  await expect(main.getByText("Is the luggage over 20 kg?")).toBeVisible();
  // While the customer answers, nothing more can be sent.
  await expect(
    page.getByRole("button", { name: "Ask a question" }),
  ).toHaveCount(0);

  await page.goto("/operator/requests");
  await expect(
    main.getByRole("listitem").filter({ hasText: trip.reference }),
  ).toBeVisible();
});
