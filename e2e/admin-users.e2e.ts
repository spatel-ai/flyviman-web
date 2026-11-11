import { expect, test } from "@playwright/test";
import {
  ACCOUNTS,
  expectNoSidewaysScroll,
  latestPasswordLink,
  PASSWORD,
  signIn,
  uniqueEmail,
} from "./support/api";

test("a super administrator invites a staff member, who sets a password and signs in", async ({
  page,
  browser,
  isMobile,
}) => {
  await signIn(page, "superAdmin", "/admin/users");
  await expect(
    page.getByRole("heading", { level: 1, name: "Users" }),
  ).toBeVisible();

  const email = uniqueEmail("staff");
  await page.getByRole("button", { name: "Add staff account" }).click();
  const dialog = page.getByRole("dialog", { name: "Add staff account" });
  await dialog.getByRole("textbox", { name: "Email" }).fill(email);
  await dialog.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: "Finance" }).click();
  await dialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(
    page.getByText(`Invitation sent to ${email}`, { exact: true }).first(),
  ).toBeVisible();

  // The invited person follows the emailed link.
  const context = await browser.newContext();
  const invitee = await context.newPage();
  await invitee.goto(await latestPasswordLink(invitee.request, email));
  await invitee
    .getByRole("textbox", { name: "New password", exact: true })
    .fill(PASSWORD);
  await invitee
    .getByRole("textbox", { name: "Repeat the new password" })
    .fill(PASSWORD);
  await invitee.getByRole("button", { name: "Set password" }).click();
  await invitee.getByRole("link", { name: "Sign in" }).click();
  await invitee.getByRole("textbox", { name: "Email" }).fill(email);
  await invitee.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await invitee.getByRole("button", { name: "Sign in" }).click();
  await expect(invitee).toHaveURL("/admin");

  // Finance sees operators but is not offered the users section.
  if (isMobile) {
    await invitee.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = invitee.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole("link", { name: "Operators" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
  await context.close();
});

test("adding staff with an email already in use explains the problem under the field", async ({
  page,
}) => {
  await signIn(page, "superAdmin", "/admin/users");
  await page.getByRole("button", { name: "Add staff account" }).click();
  const dialog = page.getByRole("dialog", { name: "Add staff account" });
  await dialog.getByRole("textbox", { name: "Email" }).fill(ACCOUNTS.ops.email);
  await dialog.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: "Operations" }).click();
  await dialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(
    dialog
      .getByText("An account with this email already exists.", { exact: true })
      .first(),
  ).toBeVisible();
});

test("operations staff can search users but are offered no way to suspend them", async ({
  page,
}) => {
  await signIn(page, "ops", "/admin/users");
  await page
    .getByRole("searchbox", { name: "Search by email or phone" })
    .fill(ACCOUNTS.customer.email);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(
    page.getByRole("cell", { name: ACCOUNTS.customer.email }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Suspend / })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add staff account" }),
  ).toHaveCount(0);
  await expectNoSidewaysScroll(page);

  const status = page.locator('[data-status="ACTIVE"]').first();
  await expect(status).toBeVisible();
  await expect(status).toHaveCSS("white-space", "nowrap");
});
