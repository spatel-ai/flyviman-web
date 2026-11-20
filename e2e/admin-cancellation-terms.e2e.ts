import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll, signIn } from "./support/api";

/**
 * Flyviman's cancellation tier table on the admin pricing page (D-172).
 *
 * Every search result shows the table in force and the desktop and mobile
 * projects run at once, so this journey never changes it: it saves the same
 * tiers (which writes nothing), shows the form's checks and, with the save
 * answered as stale, the reload. A real change is covered by the API tests.
 */

const PAGE = "/admin/pricing/rules";

test("finance reviews the tiers, sees the checks and saves through a confirmation", async ({
  page,
}) => {
  await signIn(page, "finance", PAGE);
  const section = page.getByRole("region", { name: "Cancellation terms" });
  await expect(section).toBeVisible();
  await expect(section).toContainText(/Version \d+, in force since/);
  await expect(section).toContainText("before departure, or a no-show");
  await expectNoSidewaysScroll(page);

  const form = section.getByRole("form", {
    name: "Change the cancellation tiers",
  });
  const tier1Hours = form.getByRole("textbox", {
    name: "Tier 1: hours before departure, at least",
  });
  const original = await tier1Hours.inputValue();

  // The form's checks match the API's: a reason, whole numbers, and the
  // last tier at 0 hours.
  await tier1Hours.fill("1.5");
  await form.getByRole("button", { name: "Review change" }).click();
  await expect(form.getByText("Enter a whole number.")).toBeVisible();
  await expect(
    form.getByText("Say why, in at least 3 characters."),
  ).toBeVisible();
  await tier1Hours.fill(original);
  await form.getByRole("button", { name: "Add tier" }).click();
  const tiers = await form
    .getByRole("textbox", { name: /hours before departure, at least/ })
    .count();
  await form
    .getByRole("textbox", {
      name: `Tier ${tiers}: hours before departure, at least`,
    })
    .fill("5");
  await form
    .getByRole("textbox", { name: `Tier ${tiers}: charge, % of the price` })
    .fill("100");
  await form.getByRole("textbox", { name: "Reason" }).fill("Checking");
  await form.getByRole("button", { name: "Review change" }).click();
  await expect(
    form.getByText("The last tier starts at 0 hours", { exact: false }).first(),
  ).toBeVisible();
  await form.getByRole("button", { name: `Remove tier ${tiers}` }).click();

  // Saving the same tiers asks first, then writes nothing.
  await form.getByRole("button", { name: "Review change" }).click();
  const confirm = page.getByRole("dialog", {
    name: "Change the cancellation terms?",
  });
  await expect(confirm).toContainText("Requests already made keep the terms");
  await confirm.getByRole("button", { name: /^Save version \d+$/ }).click();
  await expect(
    page.getByText("No change: the tiers are the same").first(),
  ).toBeVisible();
  await expect(confirm).toBeHidden();
});

test("a save made from a stale screen reloads the tiers and says so", async ({
  page,
}) => {
  await signIn(page, "finance", PAGE);
  const section = page.getByRole("region", { name: "Cancellation terms" });
  await expect(section).toContainText(/Version \d+/);
  await page.route(/\/api\/v1\/admin\/cancellation-terms$/, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "PRICING_RULE_NOT_CURRENT",
          message: "Stale",
          details: [],
          requestId: "test",
        },
      }),
    });
  });
  const form = section.getByRole("form", {
    name: "Change the cancellation tiers",
  });
  await form.getByRole("textbox", { name: "Reason" }).fill("From an old tab");
  await form.getByRole("button", { name: "Review change" }).click();
  await page
    .getByRole("dialog", { name: "Change the cancellation terms?" })
    .getByRole("button", { name: /^Save version/ })
    .click();
  await expect(
    section.getByText("Someone changed the cancellation tiers"),
  ).toBeVisible();
});

test("operations see no tier form", async ({ page }) => {
  await signIn(page, "ops", PAGE);
  await expect(
    page.getByRole("heading", { level: 1, name: "Pricing rules" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Cancellation terms" }),
  ).toHaveCount(0);
});
