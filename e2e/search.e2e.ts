import { expect, test } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll } from "./support/api";
import { approvedAircraft, csrf } from "./support/operators";

/** Charter search (M5, slice 1): search, results, detail, enquiry. */

function inDays(days: number, hourUtc = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}

/** YYYY-MM-DD in India, for the date field. */
function indiaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    date,
  );
}

test("a visitor searches, opens a result and requests the aircraft as an enquiry", async ({
  page,
  browser,
}) => {
  test.slow();
  // An approved light jet in Mumbai with time offered around the trip.
  const operator = await browser.newPage();
  const { id } = await approvedAircraft(operator, browser);
  const slot = await operator.request.post(
    `${API_URL}operator/aircraft/${id}/availability/slots`,
    {
      headers: await csrf(operator),
      data: {
        startsAt: inDays(3).toISOString(),
        endsAt: inDays(6).toISOString(),
        kind: "OPEN",
      },
    },
  );
  expect(slot.status()).toBe(201);
  await operator.close();

  await page.goto("/search");
  await expect(
    page.getByRole("heading", { level: 1, name: "Search aircraft" }),
  ).toBeVisible();
  for (const [search, choice, term, option] of [
    ["Find where you fly from", "From", "BOM", /BOM/],
    ["Find where you fly to", "To", "GOI", /GOI/],
  ] as const) {
    await page.getByRole("textbox", { name: search }).fill(term);
    await page.getByRole("combobox", { name: choice, exact: true }).click();
    await page.getByRole("option", { name: option }).click();
  }
  await page.getByLabel("Date").fill(indiaDate(inDays(4, 6)));
  await page.getByLabel("Departure time (India)").fill("11:00");
  await page.getByRole("spinbutton", { name: "Passengers" }).fill("4");
  await page.getByRole("button", { name: "Search aircraft" }).click();

  await expectNoSidewaysScroll(page);
  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}$/);
  const results = page.getByRole("list", { name: "Aircraft found" });
  await expect(results.getByRole("listitem").first()).toBeVisible();
  // Nothing found here is bookable (business rule 4).
  await expect(page.getByText(/book now/i)).toHaveCount(0);

  await results
    .getByRole("link", { name: /^Details:/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Either a labelled estimate or "Price on request", never a bare price.
  // The results page stays in the document, hidden: count visible text only.
  await expect(
    page
      .getByText("Estimate", { exact: true })
      .or(page.getByText("Price on request"))
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByText(/Cancellation conditions/).filter({ visible: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Request this aircraft" }).click();
  await expect(page).toHaveURL(/\/contact\?topic=PRIVATE_CHARTER/);
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(
    /I would like to request the .+ Search reference/,
  );
});

test("the search form explains what is missing", async ({ page }) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "Search aircraft" }).click();
  await expect(page.getByText("Choose where you fly from.")).toBeVisible();
  await expect(page.getByText("Choose where you fly to.")).toBeVisible();
});
