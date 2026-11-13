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

  const isMobile = test.info().project.name === "mobile";
  await page.goto("/search");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Fly private, on your schedule",
    }),
  ).toBeVisible();

  // From: a popular airport, chosen without typing.
  await page.getByRole("button", { name: /^From:/ }).click();
  await page.getByRole("option", { name: /BOM/ }).click();
  await expect(
    page.getByRole("button", { name: /^From: Mumbai/ }),
  ).toBeVisible();
  // To: typed.
  await page.getByRole("button", { name: /^To:/ }).click();
  await page.getByRole("combobox", { name: "Search to airports" }).fill("GOI");
  await page.getByRole("option", { name: /GOI/ }).click();

  // Departure: the fare calendar, then a time.
  const departure = inDays(4, 6);
  const day = indiaDate(departure);
  await page.getByRole("button", { name: /^Departure:/ }).click();
  await expect(page.getByText(/Lowest estimates per day/)).toBeVisible();
  const monthName = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
  if (!(await page.getByRole("grid", { name: monthName }).isVisible())) {
    await page.getByRole("button", { name: "Next month" }).click();
  }
  const dayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
  await page
    .getByRole("grid", { name: monthName })
    .getByRole("button", { name: new RegExp(`^${dayLabel}`) })
    .click();
  await page.getByRole("button", { name: "11:00", exact: true }).click();
  await page.getByRole("button", { name: "Done" }).click();

  // Travellers: 2 by default, two more.
  await page.getByRole("button", { name: /^Travellers:/ }).click();
  await page.getByRole("button", { name: "One more passenger" }).click();
  await page.getByRole("button", { name: "One more passenger" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByRole("button", { name: "Travellers: 4 passengers" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expectNoSidewaysScroll(page);
  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}$/);
  const results = page.getByRole("list", { name: "Aircraft found" });
  await expect(results.getByRole("listitem").first()).toBeVisible();
  await expect(page.getByRole("group", { name: "Nearby dates" })).toBeVisible();

  // Sorting and filters are kept in the address.
  await page.getByRole("radio", { name: "Fastest" }).click();
  await expect(page).toHaveURL(/sort=fastest/);
  if (isMobile) await page.getByRole("button", { name: "Filters" }).click();
  await page
    .getByRole("checkbox", { name: /^Light jet/ })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/class=LIGHT_JET/);
  if (isMobile) await page.getByRole("button", { name: "Close" }).click();
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
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Choose where you fly from.")).toBeVisible();
  await expect(page.getByText("Choose where you fly to.")).toBeVisible();
});

test("air ambulance is a request, never a search, with the emergency notice", async ({
  page,
}) => {
  await page.goto("/search?service=air-ambulance");
  await expect(page.getByText(/In an emergency, call 112/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Request an air ambulance" }),
  ).toHaveAttribute("href", /topic=MEDICAL_CHARTER/);
});
