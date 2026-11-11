import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  expectNoSidewaysScroll,
  latestCode,
  PASSWORD,
  SEEDED_OPERATOR,
  signIn,
  unique,
  uniqueEmail,
} from "./support/api";

const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

test("the operator registration form explains missing and invalid fields", async ({
  page,
}) => {
  await page.goto("/operator/register");
  await page.getByRole("textbox", { name: "Work email" }).fill("not-an-email");
  await page.getByRole("textbox", { name: "Password" }).fill("short");
  await page
    .getByRole("textbox", { name: "Phone number (optional)" })
    .fill("9876543210");
  await page.getByRole("button", { name: "Register company" }).click();

  await expect(
    page
      .getByText("Enter the company's registered name.", { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByText("Enter a valid email address.", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Use at least 12 characters.", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByText(
        "Enter the number with its country code, for example +919876543210.",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await expect(page).toHaveURL("/operator/register");
});

async function registerOperator(page: Page, legalName: string, email: string) {
  await page.goto("/operator/register");
  await page
    .getByRole("textbox", { name: "Company's registered name" })
    .fill(legalName);
  await page.getByRole("textbox", { name: "Your name" }).fill("Meera Nair");
  await page.getByRole("textbox", { name: "Work email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page
    .getByRole("checkbox", { name: /I accept the terms of use/ })
    .click();
  await page.getByRole("button", { name: "Register company" }).click();

  await expect(page).toHaveURL(/\/verify\?id=/);
  await page
    .getByRole("textbox", { name: "Verification code" })
    .fill(await latestCode(page.request, email));
  await page.getByRole("button", { name: "Verify" }).click();
  // A new operator is taken straight to its application.
  await expect(page).toHaveURL("/operator/onboarding");
}

async function addDocument(page: Page, type: string, fileName: string) {
  await page.getByRole("combobox", { name: "Document type" }).click();
  await page.getByRole("option", { name: type }).click();
  await page.getByLabel("File").setInputFiles({
    name: fileName,
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await page.getByLabel("Expiry date (optional)").fill("2030-12-31");
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(
    page.getByRole("list", { name: "Documents" }).getByText(fileName),
  ).toBeVisible();
  // The list can update from a background refresh a moment before the form
  // clears itself; wait for the form to finish, or its reset could wipe the
  // next document's choices.
  await expect(
    page.getByRole("combobox", { name: "Document type" }),
  ).toHaveText(/Choose a type/);
}

async function completeApplication(page: Page) {
  await page
    .getByRole("textbox", { name: "Registration number" })
    .fill("U62200MH2015PTC123456");
  await page
    .getByRole("textbox", { name: "Address line 1" })
    .fill("Hangar 4, Juhu Aerodrome");
  await page.getByRole("textbox", { name: "City" }).fill("Mumbai");
  await page.getByRole("textbox", { name: "State" }).fill("Maharashtra");
  await page.getByRole("textbox", { name: "Postal code" }).fill("400049");
  await page.getByRole("checkbox", { name: "Private charter" }).click();
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(
    page.getByText("Details saved", { exact: true }).first(),
  ).toBeVisible();

  await addDocument(page, "Air operator certificate", "aoc.pdf");
  await addDocument(page, "Insurance certificate", "insurance.pdf");
}

async function asStaff(
  browser: Browser,
  account: "ops" | "superAdmin" = "ops",
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, account);
  await expect(page).toHaveURL("/admin");
  return { context, page };
}

test("an operator registers, completes its application, and operations approve it", async ({
  page,
  browser,
}) => {
  test.slow();
  const legalName = unique("Skyline Aviation");
  const email = uniqueEmail("operator");
  await registerOperator(page, legalName, email);

  // Until approval the application is the only thing on offer.
  const status = page.getByRole("region", { name: "Application status" });
  await expect(
    status.getByText("Draft", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByText("Before you can submit, you still need to:", { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit for review" }),
  ).toBeDisabled();
  await page.goto("/operator");
  await expect(page).toHaveURL("/operator/onboarding");

  await completeApplication(page);
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(
    page.getByText("Application submitted", { exact: true }),
  ).toBeVisible();
  await expect(
    status.getByText(/Under review\. You cannot make changes/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save details" })).toHaveCount(
    0,
  );

  // Operations review it.
  const staff = await asStaff(browser);
  await staff.page.goto("/admin/operators");
  await staff.page
    .getByRole("searchbox", { name: "Search by company name" })
    .fill(legalName);
  await staff.page.getByRole("button", { name: "Search" }).click();
  await staff.page.getByRole("link", { name: legalName }).click();
  await expect(
    staff.page.getByRole("heading", { level: 1, name: legalName }),
  ).toBeVisible();

  // Approval is refused until the required documents are verified.
  await staff.page
    .getByRole("button", { name: "Approve", exact: true })
    .click();
  await staff.page.getByRole("button", { name: "Approve operator" }).click();
  await expect(
    staff.page
      .getByText("Verify the required documents first", { exact: true })
      .first(),
  ).toBeVisible();

  await staff.page
    .getByRole("button", { name: /^Verify Air operator certificate/ })
    .click();
  await expect(staff.page.getByText("Document verified").first()).toBeVisible();
  await staff.page
    .getByRole("button", { name: /^Verify Insurance certificate/ })
    .click();
  await expect(
    staff.page.getByRole("button", { name: /^Verify / }),
  ).toHaveCount(0);

  await staff.page
    .getByRole("button", { name: "Approve", exact: true })
    .click();
  await staff.page.getByRole("button", { name: "Approve operator" }).click();
  await expect(
    staff.page.getByText("Operator approved", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    staff.page.getByRole("button", { name: "Suspend", exact: true }),
  ).toBeVisible();
  await expectNoSidewaysScroll(staff.page);
  await staff.context.close();

  // The operator now has a dashboard.
  await page.goto("/operator");
  await expect(page).toHaveURL("/operator");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await page.goto("/operator/onboarding");
  await expect(
    status.getByText("Your organisation is approved.", { exact: false }),
  ).toBeVisible();
  // What was reviewed can no longer be edited.
  await expect(
    page.getByRole("textbox", { name: "Legal name" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "Private charter" }),
  ).toBeDisabled();
});

test("a rejection needs a reason, which the operator sees and can act on", async ({
  page,
  browser,
}) => {
  test.slow();
  const legalName = unique("Nimbus Air");
  await registerOperator(page, legalName, uniqueEmail("operator"));
  await completeApplication(page);
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(
    page.getByText("Application submitted", { exact: true }),
  ).toBeVisible();

  const staff = await asStaff(browser, "superAdmin");
  await staff.page.goto("/admin/operators");
  await staff.page
    .getByRole("searchbox", { name: "Search by company name" })
    .fill(legalName);
  await staff.page.getByRole("button", { name: "Search" }).click();
  await staff.page.getByRole("link", { name: legalName }).click();

  await staff.page.getByRole("button", { name: "Reject application" }).click();
  const dialog = staff.page.getByRole("dialog", {
    name: "Reject this application?",
  });
  // The decision cannot be confirmed without a reason.
  await expect(
    dialog.getByRole("button", { name: "Confirm rejection" }),
  ).toBeDisabled();
  await dialog
    .getByRole("textbox", { name: "Reason" })
    .fill("The insurance certificate has expired.");
  await dialog.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(
    staff.page.getByText("Application rejected", { exact: true }).first(),
  ).toBeVisible();
  await staff.context.close();

  await page.reload();
  const status = page.getByRole("region", { name: "Application status" });
  await expect(
    status
      .getByText("Your application was not approved.", { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    status
      .getByText("Reason: The insurance certificate has expired.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit for review" }),
  ).toBeEnabled();
});

test("finance staff can read an operator but are offered no decisions", async ({
  page,
}) => {
  await signIn(page, "finance");
  await expect(page).toHaveURL("/admin");
  await page.goto("/admin/operators?status=ALL");
  await page
    .getByRole("searchbox", { name: "Search by company name" })
    .fill(SEEDED_OPERATOR);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: SEEDED_OPERATOR }).first().click();

  await expect(
    page.getByRole("heading", { level: 1, name: SEEDED_OPERATOR }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Company details" }),
  ).toBeVisible();
  // Read-only: none of the decisions are offered.
  for (const name of [
    "Approve",
    "Reject application",
    "Suspend",
    "Reinstate",
  ]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  await expect(
    page.getByRole("button", { name: /^(Verify|Reject) / }),
  ).toHaveCount(0);
  await expectNoSidewaysScroll(page);
});
