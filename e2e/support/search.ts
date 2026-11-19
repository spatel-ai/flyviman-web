import { expect, type Browser, type Page } from "@playwright/test";
import { API_URL } from "./api";
import { approvedAircraft, csrf } from "./operators";

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

/** An approved light jet in Mumbai with time offered around the trip. */
export async function seedOfferedAircraft(browser: Browser) {
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
}

/** Mumbai to Goa, four days out at 11:00, four passengers; then Search. */
export async function fillAndSubmitSearch(page: Page) {
  // A click before the page has hydrated does nothing: click again until
  // the airport list has opened.
  const bom = page.getByRole("option", { name: /BOM/ });
  await expect(async () => {
    if (!(await bom.isVisible())) {
      await page.getByRole("button", { name: /^From:/ }).click();
    }
    await expect(bom).toBeVisible({ timeout: 1000 });
  }).toPass();
  await bom.click();
  await expect(
    page.getByRole("button", { name: /^From: Mumbai/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^To:/ }).click();
  await page.getByRole("combobox", { name: "Search to airports" }).fill("GOI");
  await page.getByRole("option", { name: /GOI/ }).click();

  const day = indiaDate(inDays(4, 6));
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

  await page.getByRole("button", { name: /^Travellers:/ }).click();
  await page.getByRole("button", { name: "One more passenger" }).click();
  await page.getByRole("button", { name: "One more passenger" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByRole("button", { name: "Travellers: 4 passengers" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Search", exact: true }).click();
}
