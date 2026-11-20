import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll } from "./support/api";
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
  await page
    .getByRole("textbox", { name: "Waiting at destination, per hour (₹)" })
    .fill("20,000");
  await page.getByRole("textbox", { name: "Free waiting hours" }).fill("1");
  await page
    .getByRole("textbox", { name: "Overnight charge, per night (₹)" })
    .fill("50,000");
  await page
    .getByRole("textbox", { name: "Crew charge, per night (₹)" })
    .fill("30,000");
  // The 4c charges and the per-day minimum.
  await page.getByRole("combobox", { name: "The minimum applies" }).click();
  await page.getByRole("option", { name: "Per day" }).click();
  await page
    .getByRole("textbox", { name: "Fuel surcharge, per flight (₹)" })
    .fill("5,000");
  await page
    .getByRole("textbox", { name: "Permits, per flight (₹)" })
    .fill("2000");
  await page
    .getByRole("textbox", { name: "Navigation charges, per flight (₹)" })
    .fill("1000.50");
  await page
    .getByRole("textbox", { name: "Other charge, per trip (₹)" })
    .fill("3000");
  await page.getByRole("button", { name: "Save pricing" }).click();
  // An other charge needs its name before anything is sent.
  await expect(page.getByText(/Name the charge/)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Name of the other charge" })
    .fill("Catering");
  await page.getByRole("button", { name: "Save pricing" }).click();
  // The toast and its screen-reader copy both say it: take the first.
  await expect(page.getByText("Pricing saved").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Landing charge (₹)" }),
  ).toHaveValue("15000");
  await expect(
    page.getByRole("textbox", { name: "Waiting at destination, per hour (₹)" }),
  ).toHaveValue("20000");
  await expect(
    page.getByRole("textbox", { name: "Free waiting hours" }),
  ).toHaveValue("1");
  await expect(
    page.getByRole("textbox", { name: "Crew charge, per night (₹)" }),
  ).toHaveValue("30000");
  await expect(
    page.getByRole("combobox", { name: "The minimum applies" }),
  ).toContainText("Per day");
  await expect(
    page.getByRole("textbox", { name: "Fuel surcharge, per flight (₹)" }),
  ).toHaveValue("5000");
  await expect(
    page.getByRole("textbox", { name: "Navigation charges, per flight (₹)" }),
  ).toHaveValue("1000.5");
  await expect(
    page.getByRole("textbox", { name: "Name of the other charge" }),
  ).toHaveValue("Catering");

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
  await page.getByRole("textbox", { name: "Free waiting hours" }).fill("30");
  await page.getByRole("button", { name: "Save pricing" }).click();
  await expect(page.getByText("Between 0.5 and 12 hours.")).toBeVisible();
  await expect(page.getByText("Between 0 and 24 hours.")).toBeVisible();
});

/** The model is a reviewed detail of the aircraft: changing it asks first. */
async function chooseModel(page: Page, label: string) {
  await page.getByRole("button", { name: "Edit details" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "How you price this aircraft" })
    .click();
  await page.getByRole("option", { name: label }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("dialog", { name: "Send the aircraft back to review?" })
    .getByRole("button", { name: "Save and send for review" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("an aircraft priced per flight takes one price", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id } = await approvedAircraft(page, browser);
  await page.goto(`/operator/aircraft/${id}`);
  const pricing = page.getByRole("region", { name: "Pricing" });
  await expect(
    pricing.getByRole("textbox", { name: "Hourly rate (₹)" }),
  ).toBeVisible();

  await chooseModel(page, "One price per flight");
  await expect(pricing.getByText(/No price yet/)).toBeVisible();
  await expect(
    pricing.getByRole("textbox", { name: "Hourly rate (₹)" }),
  ).toHaveCount(0);
  const sector = pricing.getByRole("textbox", { name: "Price per flight (₹)" });
  await sector.fill("lots");
  await pricing.getByRole("button", { name: "Save pricing" }).click();
  await expect(pricing.getByText(/Enter the price in rupees/)).toBeVisible();
  await sector.fill("2,50,000");
  await pricing
    .getByRole("checkbox", { name: "The prices include GST" })
    .click();
  await pricing.getByRole("button", { name: "Save pricing" }).click();
  await expect(page.getByText("Aircraft pricing saved").first()).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Pricing" })
      .getByRole("textbox", { name: "Price per flight (₹)" }),
  ).toHaveValue("250000");
});

test("an aircraft priced by fixed routes lists its routes", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id } = await approvedAircraft(page, browser);
  await page.goto(`/operator/aircraft/${id}`);
  const pricing = page.getByRole("region", { name: "Pricing" });
  await chooseModel(page, "Fixed prices per route");
  await expect(pricing.getByText(/No routes yet/)).toBeVisible();
  await pricing.getByRole("button", { name: "Add route" }).click();
  await pricing.getByRole("button", { name: "Save pricing" }).click();
  await expect(
    pricing.getByText("Choose where the route starts."),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
  await chooseLocation(page, "Route 1 from", "BOM");
  await chooseLocation(page, "Route 1 to", "GOI");
  await pricing
    .getByRole("textbox", { name: "Route 1 price per flight (₹)" })
    .fill("1,20,000");
  await pricing.getByRole("button", { name: "Add route" }).click();
  await chooseLocation(page, "Route 2 from", "GOI");
  await chooseLocation(page, "Route 2 to", "BOM");
  await pricing
    .getByRole("textbox", { name: "Route 2 price per flight (₹)" })
    .fill("1,00,000");
  await pricing.getByRole("button", { name: "Save pricing" }).click();
  // The same route the other way round is the same route.
  await expect(pricing.getByText(/already listed/)).toBeVisible();
  await pricing.getByRole("button", { name: "Remove route 2" }).click();
  await pricing.getByRole("button", { name: "Save pricing" }).click();
  await expect(page.getByText("Aircraft pricing saved").first()).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Pricing" })
      .getByRole("textbox", { name: "Route 1 price per flight (₹)" }),
  ).toHaveValue("120000");
});

/** Finds an airport in a route's location field and chooses it. */
async function chooseLocation(page: Page, label: string, code: string) {
  const pricing = page.getByRole("region", { name: "Pricing" });
  const group = pricing.getByRole("group", {
    name: `Route ${label.split(" ")[1]}`,
  });
  const end = label.endsWith("from") ? "start" : "end";
  await group
    .getByRole("textbox", { name: `Find route ${label.split(" ")[1]} ${end}` })
    .fill(code);
  await group.getByRole("combobox", { name: label }).click();
  await page
    .getByRole("option", { name: new RegExp(code) })
    .first()
    .click();
}
