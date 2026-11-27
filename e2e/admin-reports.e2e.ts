import { expect, test } from "@playwright/test";
import { signIn } from "./support/api";
import { completedPaidBooking } from "./support/paid-booking";
import { setDate } from "./support/pickers";

/**
 * Admin dashboard and reports (M10, D-189 onwards): what each role sees,
 * the period filter, the CSV download, and report money always labelled.
 */

test("operations see no money on the dashboard and no Revenue or Payments report", async ({
  page,
}) => {
  await signIn(page, "ops", "/admin");
  await expect(page).toHaveURL("/admin");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Right now" })).toBeVisible();
  await expect(main.getByRole("link", { name: /Searches/ })).toBeVisible();
  await expect(main.getByText("Flyviman revenue")).toHaveCount(0);
  await expect(main.getByText("Payments taken")).toHaveCount(0);
  await expect(main.getByText("₹")).toHaveCount(0);

  await page.goto("/admin/reports");
  const tabs = main.getByRole("navigation", { name: "Reports" });
  await expect(tabs.getByRole("link", { name: "Bookings" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Revenue" })).toHaveCount(0);
  await expect(tabs.getByRole("link", { name: "Payments" })).toHaveCount(0);
});

test("the period refuses From after To, applies a valid one and downloads a CSV", async ({
  page,
}) => {
  await signIn(page, "ops", "/admin/reports?report=bookings");
  const main = page.getByRole("main");
  const apply = main.getByRole("button", { name: "Apply" });
  await expect(main.getByRole("link", { name: "Download CSV" })).toBeVisible();

  await setDate(main, "From", "2026-11-10");
  await setDate(main, "To", "2026-11-01");
  await expect(
    main.getByText("The start date must not be after the end date."),
  ).toBeVisible();
  await expect(apply).toBeDisabled();

  await setDate(main, "To", "2026-11-10");
  await setDate(main, "From", "2026-11-01");
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(page).toHaveURL(/from=2026-11-01/);
  await expect(page).toHaveURL(/to=2026-11-10/);

  const download = page.waitForEvent("download");
  await main.getByRole("link", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^flyviman-bookings-2026-11-01-to-2026-11-10\.csv$/,
  );
});

test("finance sees money tiles and Revenue and Payments, every amount labelled", async ({
  page,
  browser,
}) => {
  test.slow();
  // Real money in the records: a trip paid in full and flown.
  await completedPaidBooking(browser);

  await signIn(page, "finance", "/admin");
  await expect(page).toHaveURL("/admin");
  const main = page.getByRole("main");
  const taken = main.getByRole("link", { name: /Payments taken/ });
  await expect(taken).toBeVisible();
  await expect(taken.getByText("₹").first()).toBeVisible();
  await expect(taken.getByText("Confirmed price").first()).toBeVisible();
  await expect(main.getByText("Flyviman revenue")).toBeVisible();

  await page.goto("/admin/reports");
  const tabs = main.getByRole("navigation", { name: "Reports" });
  await expect(tabs.getByRole("link", { name: "Revenue" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Payments" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Search" })).toHaveCount(0);

  await tabs.getByRole("link", { name: "Payments" }).click();
  await expect(page).toHaveURL(/report=payments/);
  await expect(main.getByText("Collected", { exact: true })).toBeVisible();
  await expect(main.getByText("Confirmed price").first()).toBeVisible();
});

test("a report table never lists more than 25 rows and percentages are defined", async ({
  page,
}) => {
  await signIn(page, "ops", "/admin/reports?report=operators");
  const main = page.getByRole("main");
  await expect(
    main.getByText("Response rate: responded ÷ requests."),
  ).toBeVisible();
  await expect(
    main.getByText("Decline rate: declined ÷ requests."),
  ).toBeVisible();
  const performance = main.getByRole("table").nth(1);
  expect(await performance.getByRole("row").count()).toBeLessThanOrEqual(26);
});
