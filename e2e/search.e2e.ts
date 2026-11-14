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
  // No time is suggested before a date is chosen.
  await expect(page.getByRole("button", { name: /^Departure:/ })).toContainText(
    "Pick a date, then a time",
  );
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Choose where you fly from.")).toBeVisible();
  await expect(page.getByText("Choose where you fly to.")).toBeVisible();
});

test("the open travellers picker leaves the Search button usable", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "desktop",
    "Phones use a bottom sheet, which is meant to cover the page",
  );
  // A wide laptop, where the panel used to open over the button.
  await page.setViewportSize({ width: 1710, height: 1100 });
  await page.goto("/search");
  await page.getByRole("button", { name: /^Travellers:/ }).click();
  const panel = page.getByRole("dialog", { name: "Travellers" });
  await expect(panel).toBeVisible();
  const search = page.getByRole("button", { name: "Search", exact: true });
  const a = await panel.boundingBox();
  const b = await search.boundingBox();
  if (!a || !b) throw new Error("panel or Search button not laid out");
  const overlaps =
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height;
  expect(overlaps, "the travellers panel covers the Search button").toBe(false);
});

test("the airport picker works from the keyboard", async ({ page }) => {
  test.skip(
    test.info().project.name !== "desktop",
    "Keyboard use is checked on desktop",
  );
  await page.goto("/search");
  const from = page.getByRole("button", { name: /^From:/ });
  await from.focus();
  await page.keyboard.press("Enter");
  const box = page.getByRole("combobox", { name: "Search from airports" });
  await expect(box).toBeFocused();
  // Popular airports are listed before anything is typed (F1).
  await expect(
    page.getByRole("listbox", { name: "Popular airports" }),
  ).toContainText("Mumbai");
  await box.fill("GOI");
  await expect(page.getByRole("option", { name: /GOI/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^From:/ })).toContainText(
    "GOI",
  );
  // Escape closes without choosing.
  await page.getByRole("button", { name: /^To:/ }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("combobox", { name: "Search to airports" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("combobox", { name: "Search to airports" }),
  ).toBeHidden();
  await expect(page.getByRole("button", { name: /^To:/ })).toContainText(
    "Choose airport",
  );
});

test("services not offered yet say so and lead to an enquiry", async ({
  page,
}) => {
  await page.goto("/search");
  const emptyLegs = page.getByRole("tab", { name: /Empty legs\s*Coming soon/ });
  await expect(emptyLegs).toBeVisible();
  await emptyLegs.click();
  await expect(page.getByText("Empty legs are coming soon")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Send an enquiry" }),
  ).toHaveAttribute("href", /\/contact\?topic=PRIVATE_CHARTER/);
});

test("air ambulance is a request, never a search, with the emergency notice", async ({
  page,
}) => {
  await page.goto("/search?service=air-ambulance");
  // A streamed page can briefly hold a hidden copy: count visible text only.
  await expect(
    page.getByText(/In an emergency, call 112/).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Request an air ambulance" }),
  ).toHaveAttribute("href", /topic=MEDICAL_CHARTER/);
});
