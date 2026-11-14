import { expect, test, type Page } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll, signIn } from "./support/api";
import { approvedAircraft, csrf } from "./support/operators";

/**
 * Admin pricing rules and the calculation viewer (M5 slice 3).
 *
 * Other journeys price light jets against the rules for all aircraft, so
 * this one never changes those: it adds, changes and ends a commission for
 * one category no other test prices, a different one per project because
 * desktop and mobile run at the same time.
 */

const CATEGORY: Record<string, { value: string; label: string }> = {
  desktop: { value: "TURBOPROP", label: "Turboprop" },
  mobile: { value: "HEAVY_JET", label: "Heavy jet" },
};

function inDays(days: number, hourUtc = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}

/** Ends a commission an interrupted run left on this category. */
async function clearCategory(page: Page, category: string) {
  const list = await page.request.get(`${API_URL}admin/pricing-rules`, {
    params: { scope: "CATEGORY", type: "COMMISSION", pageSize: 100 },
  });
  for (const rule of (await list.json()).data as {
    id: string;
    scopeRef: string;
  }[]) {
    if (rule.scopeRef !== category) continue;
    await page.request.post(
      `${API_URL}admin/pricing-rules/${rule.id}/deactivate`,
      {
        headers: await csrf(page),
        data: { reason: "Left by an earlier test run" },
      },
    );
  }
}

test("finance adds, changes and ends a category commission", async ({
  page,
}) => {
  const category = CATEGORY[test.info().project.name] ?? CATEGORY.desktop;
  await signIn(page, "finance", "/admin/pricing/rules");
  await expect(
    page.getByRole("heading", { level: 1, name: "Pricing rules" }),
  ).toBeVisible();
  await clearCategory(page, category.value);
  await page.reload();
  await expectNoSidewaysScroll(page);

  // The rules every price is built from are listed.
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Commission" })
      .filter({ hasText: "All aircraft" }),
  ).toBeVisible();

  // Add.
  await page.getByRole("button", { name: "Add rule" }).click();
  const add = page.getByRole("dialog", { name: "Add pricing rule" });
  await add.getByRole("combobox", { name: "Aircraft category" }).click();
  await page.getByRole("option", { name: category.label, exact: true }).click();
  await add.getByRole("textbox", { name: "Commission (%)" }).fill("8");
  await add.getByRole("textbox", { name: "Reason" }).fill("Launch rate");
  await add.getByRole("button", { name: "Add rule" }).click();
  await expect(page.getByText("Commission added").first()).toBeVisible();
  const row = page
    .getByRole("row")
    .filter({ hasText: "Commission" })
    .filter({ hasText: category.label });
  await expect(row).toContainText("8%, added on top");

  // Change: a reason is required, and a new version is made.
  const name = category.label.toLowerCase();
  await page
    .getByRole("button", { name: `Change commission for ${name}` })
    .click();
  const change = page.getByRole("dialog", { name: "Change commission" });
  await change.getByRole("textbox", { name: "Commission (%)" }).fill("7.5");
  await change.getByRole("button", { name: "Save new version" }).click();
  await expect(change.getByText(/Say why/)).toBeVisible();
  await change.getByRole("textbox", { name: "Reason" }).fill("Renegotiated");
  await change.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByText("Commission changed").first()).toBeVisible();
  await expect(row).toContainText("7.5%, added on top");

  // History keeps both versions.
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page).toHaveURL(/view=history/);
  const versions = page
    .getByRole("row")
    .filter({ hasText: "Commission" })
    .filter({ hasText: category.label });
  await expect(
    versions.filter({ hasText: "8%, added on top" }).first(),
  ).toBeVisible();
  await expect(versions.filter({ hasText: "In force" })).toHaveCount(1);

  // End: the rule for all aircraft applies again.
  await page.getByRole("tab", { name: "In force" }).click();
  await page
    .getByRole("button", { name: `End commission for ${name}` })
    .click();
  const confirm = page.getByRole("dialog");
  await confirm
    .getByRole("textbox", { name: "Reason" })
    .fill("Back to the platform rate");
  await confirm.getByRole("button", { name: "End rule" }).click();
  await expect(page.getByText(/ended/).first()).toBeVisible();
  await expect(row).toHaveCount(0);
});

test("finance traces an estimate in the calculation viewer; operations see it without the restricted figures", async ({
  page,
  browser,
}) => {
  test.slow();
  // A priced light jet in Mumbai with time offered, and one search for it.
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
  const locationId = async (q: string) =>
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
      originId: await locationId("BOM"),
      destinationId: await locationId("GOI"),
      departureAt: inDays(4, 6).toISOString(),
      passengerCount: 2,
    },
  });
  expect(search.status()).toBe(200);
  const searchId = (await search.json()).data.searchId as string;
  await operator.close();

  // Finance: the full calculation.
  await signIn(
    page,
    "finance",
    `/admin/pricing/calculations?searchId=${searchId}`,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Price calculations" }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
  const listed = page.getByRole("row").filter({ hasText: registration });
  await expect(listed).toContainText("Estimate");
  await listed.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    registration,
  );
  await expect(page.getByText("Payable to the operator")).toBeVisible();
  await expect(page.getByText("Flyviman revenue")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rules applied" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /^Hourly rate Aircraft/ }),
  ).toContainText("₹1,80,000 an hour");
  await expect(page.getByText(/× hourly rate/).first()).toBeVisible();
  await expectNoSidewaysScroll(page);
  const detailUrl = page.url();

  // Operations: the same calculation, without payable, revenue or settings.
  await page.context().clearCookies();
  await signIn(page, "ops", new URL(detailUrl).pathname);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    registration,
  );
  await expect(page.getByText(/shown to finance only/)).toBeVisible();
  await expect(page.getByText("Payable to the operator")).toHaveCount(0);
  await expect(page.getByText("₹1,80,000 an hour")).toHaveCount(0);
});

test("operations cannot change pricing rules", async ({ page }) => {
  await signIn(page, "ops", "/admin/pricing/calculations");
  // Sign-in has settled once the page is there; only then go elsewhere.
  await expect(
    page.getByRole("heading", { level: 1, name: "Price calculations" }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  if (test.info().project.name === "desktop") {
    await expect(
      nav.getByRole("link", { name: "Price calculations" }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pricing rules" })).toHaveCount(
      0,
    );
  }
  await page.goto("/admin/pricing/rules");
  await expect(page.getByText(/managed by finance/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add rule" })).toHaveCount(0);
});
