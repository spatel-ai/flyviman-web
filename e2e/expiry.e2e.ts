import { expect, test } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll } from "./support/api";
import { approvedAircraft, asStaff, csrf } from "./support/operators";

/** A calendar date in India, `days` from today. */
function indiaDate(days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  return new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

test("an expiring document is flagged to the operator and listed for operations", async ({
  page,
  browser,
}) => {
  test.slow();
  // The expiring document is attached before review: adding one to an
  // approved listing sends it back to review.
  const { id, registration } = await approvedAircraft(page, browser, {
    type: "OTHER",
    expiresAt: indiaDate(3),
  });
  const headers = await csrf(page);

  // The operator sees the expiry on the aircraft, in words.
  await page.goto(`/operator/aircraft/${id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: registration }),
  ).toBeVisible();
  await expect(page.getByText("Expires in 3 days")).toBeVisible();
  await expect(page.getByText("Not offered to customers")).toHaveCount(0);

  // Grounded, it is not offered to customers, and the page says why.
  expect(
    (
      await page.request.patch(
        `${API_URL}operator/aircraft/${id}/availability-status`,
        { headers, data: { status: "MAINTENANCE" } },
      )
    ).status(),
  ).toBe(200);
  await page.reload();
  const notice = page.getByRole("region", {
    name: "Not offered to customers",
  });
  await expect(notice).toBeVisible();
  await expect(
    notice.getByText("The aircraft is marked unavailable or in maintenance"),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Operations find it on the expiring documents page.
  const ops = await asStaff(browser, "ops");
  await ops.page.goto("/admin/documents?kind=AIRCRAFT&within=7");
  await expect(
    ops.page.getByRole("heading", { level: 1, name: "Expiring documents" }),
  ).toBeVisible();
  const row = ops.page.getByRole("row", { name: new RegExp(registration) });
  await expect(row.getByRole("link", { name: registration })).toBeVisible();
  await expect(row.getByText("Expires in 3 days")).toBeVisible();
  await expectNoSidewaysScroll(ops.page);

  // The view is kept in the address: switching to operators leaves it out.
  await ops.page.getByRole("tab", { name: "Operators" }).click();
  await expect(ops.page).toHaveURL(/kind=OPERATOR/);
  await expect(
    ops.page.getByRole("row", { name: new RegExp(registration) }),
  ).toHaveCount(0);

  // Finance has no aircraft access, so the page is not in its navigation.
  const finance = await asStaff(browser, "finance");
  await finance.page.goto("/admin");
  await expect(
    finance.page.getByRole("link", { name: "Expiring documents" }),
  ).toHaveCount(0);
  await finance.context.close();
  await ops.context.close();
});
