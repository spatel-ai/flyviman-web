import { expect, type Browser, type Page } from "@playwright/test";
import { latestCode, PASSWORD, signIn, unique, uniqueEmail } from "./api";

/** A minimal PDF the storage mock accepts. */
export const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

export async function registerOperator(
  page: Page,
  legalName: string,
  email: string,
) {
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

export async function addDocument(page: Page, type: string, fileName: string) {
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

export async function completeApplication(page: Page) {
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

export async function asStaff(
  browser: Browser,
  account: "ops" | "superAdmin" = "ops",
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, account);
  await expect(page).toHaveURL("/admin");
  return { context, page };
}

/**
 * Registers an operator through the site and has operations approve it, so
 * a journey can start from an approved organisation. `page` is left signed
 * in as the operator.
 */
export async function approvedOperator(page: Page, browser: Browser) {
  const legalName = unique("Skyline Aviation");
  await registerOperator(page, legalName, uniqueEmail("operator"));
  await completeApplication(page);
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(
    page.getByText("Application submitted", { exact: true }),
  ).toBeVisible();

  const staff = await asStaff(browser);
  await staff.page.goto("/admin/operators");
  await staff.page
    .getByRole("searchbox", { name: "Search by company name" })
    .fill(legalName);
  await staff.page.getByRole("button", { name: "Search" }).click();
  await staff.page.getByRole("link", { name: legalName }).click();
  for (const name of [
    /^Verify Air operator certificate/,
    /^Verify Insurance certificate/,
  ]) {
    await staff.page.getByRole("button", { name }).click();
  }
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
  await staff.context.close();
  return { legalName };
}
