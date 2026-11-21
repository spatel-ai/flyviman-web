import { expect, test } from "@playwright/test";
import { sendQuote } from "./support/bookings";
import { requestedTrip } from "./support/requests";

/** D-211: with a quote out the request waits for the customer, and no price is called final. */
test("after a quote is sent the request reads Awaiting customer and the proposed price is not called final", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await requestedTrip(page, browser, { priced: true });
  await sendQuote(page, trip.reference);

  await page.goto(`/operator/requests/${trip.reference}`);
  const main = page.getByRole("main");
  await expect(main.getByText("Awaiting customer").first()).toBeVisible();
  await expect(main.getByText("Awaiting operator")).toHaveCount(0);
  const proposed = main
    .locator("div")
    .filter({
      has: page.getByText("Proposed price", { exact: true }),
    })
    .last();
  await expect(proposed.getByText("Estimate").first()).toBeVisible();
  await expect(proposed).not.toContainText(/final/i);
});
