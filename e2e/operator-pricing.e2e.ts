import { expect, test } from "@playwright/test";
import { approvedAircraft } from "./support/operators";

/** Operator pricing inputs (M5 slice 2). */

test("an operator administrator sets pricing defaults and an aircraft's rate", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id } = await approvedAircraft(page, browser);

  // Defaults, from the portal navigation (behind the menu on phones).
  if (test.info().project.name === "desktop") {
    await page.goto("/operator");
    await page
      .getByRole("navigation", { name: "Operator navigation" })
      .getByRole("link", { name: "Pricing" })
      .click();
  } else {
    await page.goto("/operator/pricing");
  }
  await expect(
    page.getByRole("heading", { level: 1, name: "Pricing" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Minimum billable hours" })
    .fill("1.5");
  await page
    .getByRole("textbox", { name: "Positioning rate (% of hourly rate)" })
    .fill("80");
  await page
    .getByRole("textbox", { name: "Free positioning distance (km)" })
    .fill("50");
  await page
    .getByRole("textbox", { name: "Landing charge (₹)" })
    .fill("15,000");
  await page.getByRole("button", { name: "Save pricing" }).click();
  // The toast and its screen-reader copy both say it: take the first.
  await expect(page.getByText("Pricing saved").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Landing charge (₹)" }),
  ).toHaveValue("15000");

  // The aircraft's rate, on its page.
  await page.goto(`/operator/aircraft/${id}`);
  const pricing = page.getByRole("region", { name: "Pricing" });
  await expect(pricing.getByText(/price on request/)).toBeVisible();
  await pricing
    .getByRole("textbox", { name: "Hourly rate (₹)" })
    .fill("1,80,000");
  await pricing
    .getByRole("checkbox", { name: "The rate includes GST" })
    .click();
  await pricing.getByRole("button", { name: "Save pricing" }).click();
  // The toast and its screen-reader copy both say it: take the first.
  await expect(page.getByText("Aircraft pricing saved").first()).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Pricing" })
      .getByRole("textbox", { name: "Hourly rate (₹)" }),
  ).toHaveValue("180000");
  await expect(
    page.getByRole("region", { name: "Pricing" }).getByText(/price on request/),
  ).toHaveCount(0);
});

test("pricing explains what it needs before it can be saved", async ({
  page,
  browser,
}) => {
  test.slow();
  await approvedAircraft(page, browser);
  await page.goto("/operator/pricing");
  await page
    .getByRole("textbox", { name: "Minimum billable hours" })
    .fill("30");
  await page.getByRole("button", { name: "Save pricing" }).click();
  await expect(page.getByText("Between 0.5 and 12 hours.")).toBeVisible();
});
