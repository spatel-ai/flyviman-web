import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  expectNoSidewaysScroll,
  latestPasswordLink,
  PASSWORD,
  uniqueEmail,
} from "./support/api";
import { addDraftAircraft, approvedAircraft } from "./support/operators";

/** The invitee follows the emailed link, chooses a password and signs in. */
async function acceptInvitation(browser: Browser, email: string) {
  const context = await browser.newContext();
  const staff = await context.newPage();
  await staff.goto(await latestPasswordLink(staff.request, email));
  await staff
    .getByRole("textbox", { name: "New password", exact: true })
    .fill(PASSWORD);
  await staff
    .getByRole("textbox", { name: "Repeat the new password" })
    .fill(PASSWORD);
  await staff.getByRole("button", { name: "Set password" }).click();
  await staff.getByRole("link", { name: "Sign in" }).click();
  await staff.getByRole("textbox", { name: "Email" }).fill(email);
  await staff.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await staff.getByRole("button", { name: "Sign in" }).click();
  await expect(staff).toHaveURL(/\/operator$/);
  return { context, staff };
}

async function inviteFromTeamPage(
  page: Page,
  email: string,
  registration: string,
) {
  await page.goto("/operator/team");
  await expect(
    page.getByRole("heading", { level: 1, name: "Team" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Invite a staff member" }).click();
  const dialog = page.getByRole("dialog", { name: "Invite a staff member" });
  await dialog.getByRole("textbox", { name: "Email" }).fill(email);
  // Nothing chosen yet: the form says what is missing.
  await dialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(
    dialog.getByText("Choose at least one permission."),
  ).toBeVisible();
  await dialog.getByRole("checkbox", { name: "Manage availability" }).click();
  await dialog
    .getByRole("checkbox", { name: new RegExp(`^${registration} `) })
    .click();
  await dialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(
    page.getByText(`Invitation sent to ${email}`, { exact: true }).first(),
  ).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(email) });
  await expect(row.getByText("Invited")).toBeVisible();
  await expect(row.getByText("Manage availability")).toBeVisible();
  await expect(row.getByText("1 aircraft")).toBeVisible();
}

test("an operator invites a staff member, who manages only the aircraft assigned to them", async ({
  page,
  browser,
  isMobile,
}) => {
  test.slow();
  const assigned = await approvedAircraft(page, browser);
  const other = await addDraftAircraft(page);
  const email = uniqueEmail("staff");
  await inviteFromTeamPage(page, email, assigned.registration);
  await expectNoSidewaysScroll(page);

  const { context, staff } = await acceptInvitation(browser, email);
  // Staff see only what their permissions cover. On phones the navigation
  // lives in a drawer.
  if (isMobile) {
    await staff.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = staff.getByRole("navigation", { name: "Operator navigation" });
  await expect(nav.getByRole("link", { name: "Fleet" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Availability" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Team" })).toHaveCount(0);
  await expect(
    nav.getByRole("link", { name: "Company and documents" }),
  ).toHaveCount(0);

  await staff.goto("/operator/aircraft");
  await expect(
    staff.getByRole("link", { name: assigned.registration }),
  ).toBeVisible();
  await expect(
    staff.getByRole("link", { name: other.registration }),
  ).toHaveCount(0);
  await expect(
    staff.getByRole("link", { name: "Add an aircraft" }),
  ).toHaveCount(0);

  await staff.getByRole("link", { name: assigned.registration }).click();
  await expect(
    staff.getByRole("heading", { level: 1, name: assigned.registration }),
  ).toBeVisible();
  await expect(staff.getByRole("link", { name: "Calendar" })).toBeVisible();
  await expect(staff.getByRole("button", { name: "Edit details" })).toHaveCount(
    0,
  );
  await expect(
    staff.getByRole("button", { name: "Submit for review" }),
  ).toHaveCount(0);

  // The pages only the administrator uses say so.
  await staff.goto("/operator/team");
  await expect(
    staff.getByRole("heading", { name: "Managed by your administrator" }),
  ).toBeVisible();

  // The administrator suspends them; their next action ends the session.
  await page.goto("/operator/team");
  const row = page.getByRole("row", { name: new RegExp(email) });
  await expect(row.getByText("Active")).toBeVisible();
  await row.getByRole("button", { name: `Suspend ${email}` }).click();
  const confirm = page.getByRole("dialog", {
    name: "Suspend this staff member?",
  });
  await confirm.getByRole("textbox").fill("Left the dispatch desk");
  await confirm.getByRole("button", { name: "Suspend" }).click();
  await expect(row.getByText("Suspended")).toBeVisible();

  await staff.goto("/operator/aircraft");
  await expect(staff).toHaveURL(/\/login/);
  await context.close();
});
