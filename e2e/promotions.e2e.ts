import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll, signIn } from "./support/api";
import { approvedAircraft, asStaff, csrf } from "./support/operators";

/**
 * M10 (W4-7): finance's promotion codes, a customer trying one on a result,
 * and an operator's rates read-only on the admin operator page.
 */

function inDays(days: number, hourUtc = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}

function code(prefix: string): string {
  return `${prefix}${randomUUID().replace(/-/g, "").slice(0, 8)}`.toUpperCase();
}

/**
 * An approved, priced light jet in Mumbai with time offered, and a search
 * from Mumbai to Goa that offers it. Returns its result page and operator.
 */
async function pricedResult(browser: Browser) {
  const operator = await browser.newPage();
  const { id, registration } = await approvedAircraft(operator, browser);
  const headers = await csrf(operator);
  expect(
    (
      await operator.request.post(
        `${API_URL}operator/aircraft/${id}/availability/slots`,
        {
          headers,
          data: {
            startsAt: inDays(3).toISOString(),
            endsAt: inDays(6).toISOString(),
            kind: "OPEN",
          },
        },
      )
    ).status(),
  ).toBe(201);
  expect(
    (
      await operator.request.put(`${API_URL}operator/aircraft/${id}/pricing`, {
        headers,
        data: {
          hourlyRateMinor: 18_000_000,
          taxInclusive: false,
          commissionInclusive: false,
          minBillableHours: null,
        },
      })
    ).status(),
  ).toBe(200);
  const me = await operator.request.get(`${API_URL}operator/me`);
  const operatorId = (await me.json()).data.operatorId as string;
  const place = async (q: string) =>
    (
      await (
        await operator.request.get(`${API_URL}locations`, {
          params: { q, pageSize: 1 },
        })
      ).json()
    ).data[0].id as string;
  const search = await operator.request.post(`${API_URL}search/charter`, {
    headers,
    data: {
      originId: await place("BOM"),
      destinationId: await place("GOI"),
      departureAt: inDays(4, 6).toISOString(),
      passengerCount: 2,
    },
  });
  expect(search.status()).toBe(200);
  const data = (await search.json()).data;
  const result = data.results.find(
    (entry: { aircraft: { id: string } }) => entry.aircraft.id === id,
  );
  await operator.close();
  return {
    href: `/search/${data.searchId}/${result.resultId}`,
    operatorId,
    registration,
  };
}

test("finance creates a promotion code and ends it", async ({ page }) => {
  const promo = code("WEB");
  await signIn(page, "finance", "/admin/promotions");
  await expect(
    page.getByRole("heading", { level: 1, name: "Promotions" }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.getByRole("button", { name: "New promotion" }).click();
  const dialog = page.getByRole("dialog", { name: "New promotion code" });
  // The API's limits are checked before sending.
  await dialog.getByRole("button", { name: "Create promotion" }).click();
  await expect(dialog.getByText("Enter a value.")).toBeVisible();

  await dialog.getByRole("textbox", { name: "Code" }).fill(promo.toLowerCase());
  await dialog.getByRole("textbox", { name: "Name" }).fill("Web offer");
  await dialog.getByRole("textbox", { name: "Percentage off" }).fill("5");
  await dialog
    .getByLabel("Last day")
    .fill(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
        inDays(30),
      ),
    );
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Web campaign");
  await dialog.getByRole("button", { name: "Create promotion" }).click();
  await expect(
    page.getByText(`Promotion ${promo} created`).first(),
  ).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: promo });
  await expect(row).toContainText("5% off");
  await expect(row).toContainText("1 per customer");
  await expect(row).toContainText("Active");

  await row.getByRole("button", { name: `End promotion ${promo}` }).click();
  const confirm = page.getByRole("dialog", { name: `End promotion ${promo}?` });
  await confirm.getByRole("textbox").fill("Budget used");
  await confirm.getByRole("button", { name: "End promotion" }).click();
  await expect(
    page.getByText(`Promotion ${promo} ended`).first(),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: promo })).toHaveCount(0);

  await page.getByRole("tab", { name: "Ended" }).click();
  await expect(page.getByRole("row").filter({ hasText: promo })).toContainText(
    "Ended",
  );
});

test("operations do not see promotions", async ({ page }) => {
  await signIn(page, "ops", "/admin/promotions");
  await expect(
    page.getByText("Promotions are managed by finance."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "New promotion" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Promotions" }),
  ).toHaveCount(0);
});

test("a visitor tries a promotion code on a result", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await pricedResult(browser);
  const promo = code("TRY");
  const finance = await asStaff(browser, "finance");
  const created = await finance.page.request.post(
    `${API_URL}admin/promotions`,
    {
      headers: await csrf(finance.page),
      data: {
        code: promo,
        name: "Try offer",
        kind: "PERCENT",
        percent: 5,
        currency: "INR",
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: inDays(30).toISOString(),
        reason: "Web test",
      },
    },
  );
  expect(created.status()).toBe(201);
  await finance.context.close();

  await page.goto(trip.href);
  const field = page.getByRole("textbox", { name: "Promotion code" });
  await expect(field).toBeVisible();
  await expectNoSidewaysScroll(page);

  await field.fill("NOSUCHCODE");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(
    page.getByText("This code is not valid. Check it and try again."),
  ).toBeVisible();

  await field.fill(promo.toLowerCase());
  await page.getByRole("button", { name: "Apply" }).click();
  const section = page.getByRole("region", { name: "Promotion code" });
  await expect(section.getByText(/Try offer/)).toBeVisible();
  await expect(section.getByText(/off this trip/)).toBeVisible();
  // The new price is labelled as an estimate (rule 1).
  await expect(section.getByText(/estimate/i).first()).toBeVisible();
});

test("finance reads an operator's rates on the operator page", async ({
  page,
  browser,
}) => {
  test.slow();
  const trip = await pricedResult(browser);
  await signIn(page, "finance", `/admin/operators/${trip.operatorId}`);
  const heading = page.getByRole("heading", { name: "Pricing", exact: true });
  await expect(heading).toBeVisible();
  const section = heading.locator("..");
  await expect(section.getByText(trip.registration)).toBeVisible();
  await expect(section.getByText(/1,80,000 per hour/)).toBeVisible();
  await expectNoSidewaysScroll(page);
});
