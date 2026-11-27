import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./support/api";
import { completedPaidBooking, settlementFor } from "./support/paid-booking";
import { setDate } from "./support/pickers";

/**
 * Operator settlements and reconciliation in the admin portal (M9, D-197,
 * D-198): a completed, paid trip becomes a Due settlement that finance holds,
 * releases and marks paid, each with a reason; operations are refused.
 * The Refunds History "Gateway reference" is not covered here: a refund needs
 * a cancelled booking and a refund started by finance.
 */

/**
 * What axe's `scrollable-region-focusable` checks: every scrolling box that
 * overflows is keyboard-reachable and has a name.
 */
async function expectScrollersReachable(page: Page) {
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main *")]
      .filter((el) => {
        const { overflowX, overflowY } = getComputedStyle(el);
        const scrolls = /(auto|scroll)/.test(overflowX + overflowY);
        return (
          scrolls &&
          (el.scrollWidth > el.clientWidth + 1 ||
            el.scrollHeight > el.clientHeight + 1)
        );
      })
      .filter(
        (el) =>
          el.tabIndex < 0 ||
          el.getAttribute("role") !== "region" ||
          !el.getAttribute("aria-label"),
      )
      .map((el) => el.className),
  );
  expect(broken).toEqual([]);
}

test("finance holds, releases and pays a settlement; the amounts add up", async ({
  page,
  browser,
}) => {
  test.slow();
  const { reference } = await completedPaidBooking(browser);
  await signIn(page, "finance", "/admin");
  await expect(page).toHaveURL("/admin");
  const settlement = await settlementFor(page, reference);
  expect(settlement.status).toBe("DUE");
  expect(
    settlement.commissionMinor + settlement.taxMinor + settlement.payableMinor,
  ).toBe(settlement.keptMinor);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/settlements");
  const main = page.getByRole("main");
  const row = main.getByRole("row").filter({ hasText: reference });
  await expect(row.getByText("Due", { exact: true })).toBeVisible();
  // Payout, commission and tax amounts are not prices: no price pill.
  await expect(row.getByText("Confirmed price")).toHaveCount(0);

  // Status and the row action are in view without scrolling sideways.
  const viewport = page.viewportSize()!;
  for (const target of [
    main.getByRole("columnheader", { name: "Status" }),
    row.getByRole("button", { name: `Update the settlement for ${reference}` }),
  ]) {
    const box = (await target.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  }
  await expectScrollersReachable(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expectScrollersReachable(page);
  await expect(
    row.getByRole("button", { name: `Update the settlement for ${reference}` }),
  ).toBeInViewport();

  const update = row.getByRole("button", {
    name: `Update the settlement for ${reference}`,
  });
  const dialog = page.getByRole("dialog", {
    name: `Settlement for ${reference}`,
  });

  // A reason is required.
  await update.click();
  await dialog.getByRole("combobox", { name: "Action" }).click();
  await page.getByRole("option", { name: "Put on hold" }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    dialog.getByText("Give a reason: it is kept in the audit record."),
  ).toBeVisible();
  await dialog.getByLabel("Reason").fill("Waiting for the invoice");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Settlement on hold").first()).toBeVisible();
  await expect(row.getByText("On hold")).toBeVisible();

  await update.click();
  await dialog.getByLabel("Reason").fill("Invoice received");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Hold released/).first()).toBeVisible();
  await expect(row.getByText("Due", { exact: true })).toBeVisible();

  await update.click();
  await dialog.getByRole("combobox", { name: "Action" }).click();
  await page.getByRole("option", { name: "Mark paid" }).click();
  await dialog.getByLabel("Bank transfer reference").fill(`NEFT-${reference}`);
  await dialog.getByLabel("Reason").fill("Transferred today");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Settlement marked paid").first()).toBeVisible();
  await expect(row.getByText("Paid", { exact: true })).toBeVisible();
  await expect(row.getByText(`NEFT-${reference}`)).toBeVisible();
  await expect(
    row.getByRole("button", { name: /Update the settlement/ }),
  ).toHaveCount(0);
});

test("finance opens the reconciliation for a period", async ({ page }) => {
  await signIn(page, "finance", "/admin/reconciliation");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 1, name: "Reconciliation" }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "From (IST)", exact: true }),
  ).toBeVisible();
  await setDate(main, "From (IST)", "2026-01-01");
  await setDate(main, "To (IST, included)", "2026-03-01");
  await expect(
    main.getByRole("heading", { name: /^Mismatches \(\d+/ }),
  ).toBeVisible();

  // Over 92 days is refused in words.
  await setDate(main, "To (IST, included)", "2026-11-01");
  await expect(main.getByText(/at most 92 days/)).toBeVisible();
});

test("operations are refused the settlements and reconciliation pages", async ({
  page,
}) => {
  await signIn(page, "ops", "/admin/settlements");
  const main = page.getByRole("main");
  await expect(
    main.getByText("Payments and refunds are managed by finance."),
  ).toBeVisible();
  await expect(main.getByRole("table")).toHaveCount(0);

  await page.goto("/admin/reconciliation");
  await expect(
    main.getByText("Payments and refunds are managed by finance."),
  ).toBeVisible();
  await expect(main.getByText(/Mismatches/)).toHaveCount(0);
});

test("a table wider than its box is a named, focusable region (payments and roles)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "superAdmin", "/admin/payments");
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toBeVisible();
  await expectScrollersReachable(page);
  await page.goto("/admin/roles");
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toBeVisible();
  await expectScrollersReachable(page);
});

test("the reconciliation dates are Indian days and mismatches are paged", async ({
  page,
}) => {
  await signIn(page, "finance", "/admin/reconciliation");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("button", { name: "From (IST)", exact: true }),
  ).toBeVisible();
  await expect(
    main.getByText("Whole Indian days, midnight to midnight."),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: /^Mismatches \(\d+/ }),
  ).toBeVisible();
  const rows = await main.getByRole("table").getByRole("row").count();
  expect(rows).toBeLessThanOrEqual(21);
});
