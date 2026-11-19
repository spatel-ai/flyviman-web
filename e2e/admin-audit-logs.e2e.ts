import { expect, test, type Page } from "@playwright/test";
import { API_URL, signIn } from "./support/api";
import { csrf } from "./support/operators";

/**
 * The audit log viewer (M10). Finance changes a commission, which writes a
 * pricing rule record; operations may list it but not read its contents.
 * A different category per project, because desktop and mobile run at once.
 */
const CATEGORY: Record<string, string> = {
  desktop: "HELICOPTER",
  mobile: "MIDSIZE_JET",
};

async function endCommission(page: Page, category: string, reason: string) {
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
      { headers: await csrf(page), data: { reason } },
    );
  }
}

test("finance reads a pricing change; operations sees it as restricted", async ({
  page,
  browser,
}) => {
  const category = CATEGORY[test.info().project.name] ?? CATEGORY.desktop;
  await signIn(page, "finance", "/admin/audit-logs");
  await expect(
    page.getByRole("heading", { level: 1, name: "Audit log" }),
  ).toBeVisible();
  await endCommission(page, category, "Left by an earlier test run");

  const created = await page.request.post(`${API_URL}admin/pricing-rules`, {
    headers: await csrf(page),
    data: {
      type: "COMMISSION",
      scope: "CATEGORY",
      scopeRef: category,
      config: { percent: 7, mode: "ADD_ON" },
      reason: "Audit viewer check",
    },
  });
  expect(created.status()).toBe(201);
  const ruleId = (await created.json()).data.id as string;

  try {
    // Filters live in the URL; the newest record for this rule is listed.
    await page.goto(
      `/admin/audit-logs?entityType=PricingRule&entityId=${ruleId}&action=pricing_rule.create`,
    );
    await expect(page.getByLabel("Entity ID")).toHaveValue(ruleId);
    await expect(page.getByText("pricing_rule.create").first()).toBeVisible();
    await page
      .getByRole("button", { name: /View pricing_rule.create/ })
      .click();

    const sheet = page.getByRole("dialog", { name: "Audit record" });
    await expect(sheet.getByText("Audit viewer check")).toBeVisible();
    const diff = sheet.getByTestId("audit-diff");
    await expect(diff.getByText("config.percent")).toBeVisible();
    await expect(diff.getByText("Added").first()).toBeVisible();
    await expect(sheet.getByText("Restricted.")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);

    // A filter that matches nothing says so, and Clear returns to the list.
    await page.getByLabel("Action").fill("no.such.action");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/action=no\.such\.action/);
    await expect(
      page.getByText("No records match these filters"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/admin\/audit-logs$/);

    // Operations lists the same record but not its contents (D-103).
    const ops = await (await browser.newContext()).newPage();
    await signIn(ops, "ops", "/admin");
    await expect(ops).toHaveURL("/admin");
    await ops.goto(`/admin/audit-logs?entityId=${ruleId}`);
    await ops.getByRole("button", { name: /View pricing_rule.create/ }).click();
    const opsSheet = ops.getByRole("dialog", { name: "Audit record" });
    await expect(opsSheet.getByText("Restricted.").first()).toBeVisible();
    await expect(opsSheet.getByText("Audit viewer check")).toHaveCount(0);
    await expect(opsSheet.getByTestId("audit-diff")).toHaveCount(0);
    await ops.context().close();
  } finally {
    await endCommission(page, category, "Audit viewer check done");
  }
});

test("operations is offered the audit log in the navigation", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "ops", "/admin");
  await expect(page).toHaveURL("/admin");
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  await nav.getByRole("link", { name: "Audit log" }).click();
  await expect(page).toHaveURL("/admin/audit-logs");
  await expect(
    page.getByRole("heading", { level: 1, name: "Audit log" }),
  ).toBeVisible();
});

test("a customer is refused the audit log", async ({ page }) => {
  await signIn(page, "customer");
  await expect(page).toHaveURL("/");
  await page.goto("/admin/audit-logs");
  // Sent home without the admin shell ever being shown.
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("navigation", { name: "Admin navigation" }),
  ).toHaveCount(0);
});
