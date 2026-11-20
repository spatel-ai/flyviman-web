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

  // Another admin changes it while this one has the dialog open: the refusal
  // refreshes the list, so trying again works on the latest version.
  await page
    .getByRole("button", { name: `Change commission for ${name}` })
    .click();
  await change.getByRole("textbox", { name: "Commission (%)" }).fill("6");
  await change.getByRole("textbox", { name: "Reason" }).fill("Stale tab");
  const current = await page.request.get(`${API_URL}admin/pricing-rules`, {
    params: { scope: "CATEGORY", type: "COMMISSION", pageSize: 100 },
  });
  const inForce = (
    (await current.json()).data as {
      id: string;
      scopeRef: string;
    }[]
  ).find((rule) => rule.scopeRef === category.value);
  const elsewhere = await page.request.patch(
    `${API_URL}admin/pricing-rules/${inForce?.id}`,
    {
      headers: await csrf(page),
      data: {
        config: { percent: 7, mode: "ADD_ON" },
        reason: "Changed in another tab",
      },
    },
  );
  expect(elsewhere.status()).toBe(200);
  await change.getByRole("button", { name: "Save new version" }).click();
  await expect(
    change.getByText(/Someone changed or ended this rule/),
  ).toBeVisible();
  // The open dialog hides the page from the accessibility tree: look after.
  await change.getByRole("button", { name: "Cancel" }).click();
  await expect(row).toContainText("7%, added on top");
  await page
    .getByRole("button", { name: `Change commission for ${name}` })
    .click();
  await change.getByRole("textbox", { name: "Commission (%)" }).fill("6");
  await change.getByRole("textbox", { name: "Reason" }).fill("Second try");
  await change.getByRole("button", { name: "Save new version" }).click();
  await expect(row).toContainText("6%, added on top");

  // History keeps every version.
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

/** Ends rules of these types an interrupted run left on this category. */
async function clearCategoryTypes(page: Page, category: string) {
  for (const type of [
    "MARKUP",
    "SERVICE_FEE",
    "DISCOUNT",
    "MIN_BILLABLE_HOURS",
  ]) {
    const list = await page.request.get(`${API_URL}admin/pricing-rules`, {
      params: { scope: "CATEGORY", type, pageSize: 100 },
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
}

test("finance adds, changes and ends a markup, a service fee, a discount and a per-day minimum", async ({
  page,
}) => {
  test.slow();
  // Platform rules of these types would change every other test's prices,
  // so this journey uses the category no other test prices.
  const category = CATEGORY[test.info().project.name] ?? CATEGORY.desktop;
  const name = category.label.toLowerCase();
  await signIn(page, "finance", "/admin/pricing/rules");
  await expect(
    page.getByRole("heading", { level: 1, name: "Pricing rules" }),
  ).toBeVisible();
  await clearCategoryTypes(page, category.value);
  await page.reload();

  async function add(
    rule: string,
    fields: Record<string, string>,
    reason: string,
  ) {
    await page.getByRole("button", { name: "Add rule" }).click();
    const dialog = page.getByRole("dialog", { name: "Add pricing rule" });
    await dialog.getByRole("combobox", { name: "Rule" }).click();
    await page.getByRole("option", { name: rule, exact: true }).click();
    await dialog.getByRole("combobox", { name: "Aircraft category" }).click();
    await page
      .getByRole("option", { name: category.label, exact: true })
      .click();
    for (const [label, value] of Object.entries(fields)) {
      await dialog.getByRole("textbox", { name: label }).fill(value);
    }
    await dialog.getByRole("textbox", { name: "Reason" }).fill(reason);
    await dialog.getByRole("button", { name: "Add rule" }).click();
    await expect(page.getByText(`${rule} added`).first()).toBeVisible();
  }
  const row = (rule: string) =>
    page
      .getByRole("row")
      .filter({ hasText: rule })
      .filter({ hasText: category.label });

  try {
    await add("Markup", { "Markup (%)": "5" }, "Launch markup");
    await expect(row("Markup")).toContainText("5% of the operator's price");
    await add("Service fee", { "Fee per trip (₹)": "2,500" }, "Launch fee");
    await expect(row("Service fee")).toContainText("₹2,500 per trip");
    await add(
      "Discount",
      { "Name shown to customers": "Winter offer", "Discount (%)": "7.5" },
      "Season",
    );
    await expect(row("Discount")).toContainText("Winter offer 7.5% off");

    // The minimum per day.
    await page.getByRole("button", { name: "Add rule" }).click();
    const minimum = page.getByRole("dialog", { name: "Add pricing rule" });
    await minimum.getByRole("combobox", { name: "Rule" }).click();
    await page
      .getByRole("option", { name: "Minimum billable hours", exact: true })
      .click();
    await minimum.getByRole("combobox", { name: "Aircraft category" }).click();
    await page
      .getByRole("option", { name: category.label, exact: true })
      .click();
    await minimum.getByRole("textbox", { name: "Hours per flight" }).fill("2");
    await minimum
      .getByRole("combobox", { name: "The minimum applies" })
      .click();
    await page.getByRole("option", { name: "Per day" }).click();
    await minimum.getByRole("textbox", { name: "Reason" }).fill("Day minimum");
    await minimum.getByRole("button", { name: "Add rule" }).click();
    await expect(row("Minimum billable hours")).toContainText("2 h per day");

    // Change: a reason is required; the same settings write nothing new.
    await page
      .getByRole("button", { name: `Change markup for ${name}` })
      .click();
    const change = page.getByRole("dialog", { name: "Change markup" });
    await change.getByRole("textbox", { name: "Markup (%)" }).fill("60");
    await change.getByRole("button", { name: "Save new version" }).click();
    await expect(change.getByText(/Enter a value from 0 to 50/)).toBeVisible();
    await change.getByRole("textbox", { name: "Markup (%)" }).fill("6");
    await change.getByRole("textbox", { name: "Reason" }).fill("Review");
    await change.getByRole("button", { name: "Save new version" }).click();
    await expect(row("Markup")).toContainText("6% of the operator's price");
    await expectNoSidewaysScroll(page);
  } finally {
    await clearCategoryTypes(page, category.value);
  }
  await page.reload();
  await expect(row("Markup")).toHaveCount(0);
  await expect(row("Discount")).toHaveCount(0);
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
  await expect(
    page.getByRole("main").getByText("Payable to the operator"),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Flyviman revenue"),
  ).toBeVisible();
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
  await expect(
    page.getByRole("main").getByText(/shown to finance only/),
  ).toBeVisible();
  await expect(page.getByText("Payable to the operator")).toHaveCount(0);
  await expect(page.getByText("₹1,80,000 an hour")).toHaveCount(0);
  // Line amounts would give the split away; the tax line keeps its amount.
  await expect(page.getByText("Finance only").first()).toBeVisible();
  await expect(page.getByRole("row", { name: /^GST/ })).toContainText("₹");
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
  await expect(
    page.getByRole("main").getByText(/managed by finance/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add rule" })).toHaveCount(0);
});
