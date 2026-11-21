import { expect, test, type Page } from "@playwright/test";
import {
  API_URL,
  expectNoSidewaysScroll,
  latestPasswordLink,
  PASSWORD,
  signIn,
  uniqueEmail,
} from "./support/api";
import { csrf } from "./support/operators";

/** Opens the admin navigation (a sheet on phones) and returns it. */
async function adminNav(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  return page.getByRole("navigation", { name: "Admin navigation" });
}

test("a super administrator changes a staff member's role, which signs them out", async ({
  page,
  browser,
}) => {
  await signIn(page, "superAdmin", "/admin/users");
  await expect(
    page.getByRole("heading", { level: 1, name: "Users" }),
  ).toBeVisible();

  // A fresh operations account, so no seeded account changes role.
  const email = uniqueEmail("role");
  const created = await page.request.post(`${API_URL}admin/staff`, {
    headers: await csrf(page),
    data: { email, role: "OPS" },
  });
  expect(created.status()).toBe(201);
  const context = await browser.newContext();
  const staff = await context.newPage();
  const link = await latestPasswordLink(staff.request, email);
  const token = decodeURIComponent(link.split("token=")[1]);
  expect(
    (
      await staff.request.post(`${API_URL}auth/password/reset`, {
        data: { token, password: PASSWORD },
      })
    ).status(),
  ).toBe(204);
  await signIn(staff, { email, password: PASSWORD });
  await expect(staff).toHaveURL("/admin");

  await page
    .getByRole("searchbox", { name: "Search by email or phone" })
    .fill(email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: `Change role of ${email}` }).click();
  const dialog = page.getByRole("dialog", { name: "Change role" });
  await expect(dialog.getByText("Operations", { exact: true })).toBeVisible();

  // The reason is required, as the API requires it.
  await dialog.getByRole("combobox", { name: "New role" }).click();
  await page.getByRole("option", { name: "Finance" }).click();
  await dialog.getByRole("button", { name: "Change role" }).click();
  await expect(
    dialog.getByText("Give a reason of at least 3 characters."),
  ).toBeVisible();

  await dialog
    .getByRole("textbox", { name: "Reason" })
    .fill("Moved to the finance team.");
  await dialog.getByRole("button", { name: "Change role" }).click();
  await expect(
    page.getByText("Role changed to Finance", { exact: true }).first(),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("row", { name: new RegExp(email) }).getByText("Finance"),
  ).toBeVisible();

  // The staff member's open session has ended.
  await staff.goto("/admin/users");
  await expect(staff).toHaveURL(/\/login/);
  await context.close();
});

test("a super administrator reads the roles and permissions page", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "superAdmin", "/admin");
  await expect(page).toHaveURL("/admin");
  await (
    await adminNav(page, isMobile)
  )
    .getByRole("link", { name: "Roles" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Roles and permissions" }),
  ).toBeVisible();

  await expect(page.getByText("Super administrator").first()).toBeVisible();
  const capabilities = page.getByRole("region", {
    name: "Operator staff capabilities",
  });
  await expect(capabilities.getByText("Manage bookings")).toBeVisible();
  await expect(
    capabilities.getByText(/See and answer booking requests/),
  ).toBeVisible();

  // The route table comes from the API's own checks.
  await page
    .getByRole("searchbox", { name: "Search routes" })
    .fill("/admin/users/:id/role");
  const row = page.getByRole("row", {
    name: /PATCH \/admin\/users\/:id\/role/,
  });
  await expect(row).toBeVisible();
  await expect(row.getByText("Super administrator")).toBeVisible();
  await expect(row.getByText("Operations")).toHaveCount(0);

  // Filtered to customers, the route is gone.
  await page.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: "Customer" }).click();
  await expect(page.getByText("No routes match")).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("operations are not offered the roles page and are told who manages it", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "ops", "/admin");
  await expect(page).toHaveURL("/admin");
  const nav = await adminNav(page, isMobile);
  await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Roles" })).toHaveCount(0);

  await page.goto("/admin/roles");
  await expect(
    page
      .getByRole("main")
      .getByText("Roles and permissions are managed by super administrators."),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
