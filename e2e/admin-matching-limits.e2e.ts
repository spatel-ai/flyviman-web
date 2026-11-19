import { expect, test, type Page } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll, signIn } from "./support/api";
import { csrf } from "./support/operators";

/**
 * Matching limits (operations and super admins write, finance reads).
 *
 * A limit changes which aircraft searches offer, so this journey uses one
 * category no other test searches, a different one per project because
 * desktop and mobile run at the same time, and ends its rule at the end.
 */

const CATEGORY: Record<string, { value: string; label: string }> = {
  desktop: { value: "TURBOPROP", label: "Turboprop" },
  mobile: { value: "HEAVY_JET", label: "Heavy jet" },
};

async function clearCategory(page: Page, category: string) {
  const list = await page.request.get(`${API_URL}admin/pricing-rules`, {
    params: { scope: "CATEGORY", type: "MATCHING_LIMITS", pageSize: 100 },
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

test("operations set, change and end matching limits; finance reads them", async ({
  page,
  browser,
}) => {
  test.slow();
  const category = CATEGORY[test.info().project.name] ?? CATEGORY.desktop;
  const name = category.label.toLowerCase();
  await signIn(page, "ops", "/admin/matching-limits");
  await expect(
    page.getByRole("heading", { level: 1, name: "Matching limits" }),
  ).toBeVisible();
  await clearCategory(page, category.value);
  await page.reload();
  await expectNoSidewaysScroll(page);

  // Add a minimum notice for one category.
  await page.getByRole("button", { name: "Add limits" }).click();
  const add = page.getByRole("dialog", { name: "Add matching limits" });
  await add.getByRole("combobox", { name: "Applies to" }).click();
  await page
    .getByRole("option", { name: "One aircraft category", exact: true })
    .click();
  await add.getByRole("combobox", { name: "Aircraft category" }).click();
  await page.getByRole("option", { name: category.label, exact: true }).click();
  await add
    .getByRole("textbox", { name: "Minimum notice (minutes)" })
    .fill("10081");
  await add.getByRole("textbox", { name: "Reason" }).fill("Crew rostering");
  await add.getByRole("button", { name: "Add limits" }).click();
  await expect(add.getByText(/At most 10,080 minutes/)).toBeVisible();
  await add
    .getByRole("textbox", { name: "Minimum notice (minutes)" })
    .fill("45");
  await add.getByRole("button", { name: "Add limits" }).click();
  await expect(page.getByText("Matching limits added").first()).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: category.label });
  await expect(row).toContainText("45 min notice");

  // Change: a new version.
  await page.getByRole("button", { name: `Change limits for ${name}` }).click();
  const change = page.getByRole("dialog", { name: /Change limits for/ });
  await change
    .getByRole("textbox", { name: "Minimum notice (minutes)" })
    .fill("60");
  await change.getByRole("textbox", { name: "Reason" }).fill("Longer lead");
  await change.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByText("Matching limits changed").first()).toBeVisible();
  await expect(row).toContainText("60 min notice");

  // Finance sees the same list, read only.
  const finance = await browser.newContext();
  const financePage = await finance.newPage();
  await signIn(financePage, "finance", "/admin/matching-limits");
  await expect(
    financePage.getByRole("heading", { level: 1, name: "Matching limits" }),
  ).toBeVisible();
  await expect(
    financePage.getByRole("row").filter({ hasText: category.label }),
  ).toContainText("60 min notice");
  await expect(financePage.getByText("Read only").first()).toBeVisible();
  await expect(
    financePage.getByRole("button", { name: "Add limits" }),
  ).toHaveCount(0);
  await expect(
    financePage.getByRole("button", { name: /^Change limits/ }),
  ).toHaveCount(0);
  await finance.close();

  // End the category rule.
  await page.getByRole("button", { name: `End limits for ${name}` }).click();
  const confirm = page.getByRole("dialog");
  await confirm
    .getByRole("textbox", { name: "Reason" })
    .fill("No longer needed");
  await confirm.getByRole("button", { name: "End limits" }).click();
  await expect(row).toHaveCount(0);
});
