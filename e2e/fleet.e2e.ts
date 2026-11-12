import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll, signIn } from "./support/api";
import { approvedOperator, asStaff, PDF } from "./support/operators";

/** The listing's status badge beside the page heading. */
function listingStatus(page: Page) {
  return page.locator("h1 + [data-status]");
}

async function addAircraftDocument(page: Page, type: string, file: string) {
  await page.getByRole("combobox", { name: "Document type" }).click();
  await page.getByRole("option", { name: type, exact: true }).click();
  await page.getByLabel("Expiry date").fill("2030-12-31");
  await page.getByLabel("File").setInputFiles({
    name: file,
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(page.getByText(`${type} · ${file}`)).toBeVisible();
  // The upload succeeded, so no error is shown and the form is cleared.
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Expiry date")).toHaveValue("");
}

test("an operator lists an aircraft and operations reject, then approve it", async ({
  page,
  browser,
}) => {
  test.slow();
  await approvedOperator(page, browser);

  // The approved operator now has a fleet.
  await page.goto("/operator/aircraft");
  await expect(
    page.getByRole("heading", { level: 1, name: "Fleet" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Add an aircraft" }).click();

  const registration = `VT-${randomUUID().slice(0, 13).toUpperCase()}`;
  await page.getByRole("textbox", { name: "Registration" }).fill(registration);
  await page.getByRole("textbox", { name: "Manufacturer" }).fill("Cessna");
  await page.getByRole("textbox", { name: "Model" }).fill("Citation CJ3+");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Light jet", exact: true }).click();
  await page.getByLabel("Passenger capacity").fill("8");
  await page.getByLabel("Range (km)").fill("3200");
  // Saving without a home base is explained before anything is sent.
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(
    page.getByText("Choose the aircraft's home base."),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Find the home base" }).fill("BOM");
  await page.getByRole("combobox", { name: "Home base" }).click();
  await page
    .getByRole("option", { name: /Mumbai/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: registration }),
  ).toBeVisible();

  // What is still needed is named in words, not codes.
  await expect(
    page.getByText("Insurance (current, not expired)", { exact: true }),
  ).toBeVisible();
  await addAircraftDocument(
    page,
    "Certificate of registration",
    "registration.pdf",
  );
  await addAircraftDocument(
    page,
    "Certificate of airworthiness",
    "airworthiness.pdf",
  );
  await addAircraftDocument(page, "Insurance", "insurance.pdf");
  await expect(page.getByText("Still needed before submit")).toHaveCount(0);

  // A draft's document can be removed, and is needed again.
  await page
    .getByRole("button", { name: "Remove Insurance (insurance.pdf)" })
    .click();
  await page
    .getByRole("dialog", { name: "Remove this document?" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(
    page.getByText("Insurance (current, not expired)", { exact: true }),
  ).toBeVisible();
  await addAircraftDocument(page, "Insurance", "insurance.pdf");
  await expect(page.getByText("Still needed before submit")).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(listingStatus(page)).toHaveAttribute(
    "data-status",
    "PENDING_REVIEW",
  );

  // Operations reject it with a reason.
  const staff = await asStaff(browser);
  // Many aircraft wait in the queue during a test run, so open this one
  // directly; the queue itself is covered by its tab and pagination tests.
  const aircraftId = page.url().split("/").pop()!;
  const openReview = async () => {
    await staff.page.goto(`/admin/aircraft/${aircraftId}`);
    await expect(
      staff.page.getByRole("heading", { level: 1, name: registration }),
    ).toBeVisible();
  };
  await openReview();
  await staff.page.getByRole("button", { name: "Reject", exact: true }).click();
  await staff.page
    .getByRole("textbox", { name: "Reason" })
    .fill("The insurance schedule does not name this aircraft.");
  await staff.page
    .getByRole("dialog")
    .getByRole("button", { name: "Reject" })
    .click();
  await expect(listingStatus(staff.page)).toHaveAttribute(
    "data-status",
    "REJECTED",
  );

  // The operator sees why, and resubmits.
  await page.reload();
  await expect(
    page.getByText("The insurance schedule does not name this aircraft."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(listingStatus(page)).toHaveAttribute(
    "data-status",
    "PENDING_REVIEW",
  );

  // Operations verify the documents and approve.
  await openReview();
  for (let left = 3; left > 0; left -= 1) {
    await staff.page
      .getByRole("button", { name: "Mark verified" })
      .first()
      .click();
    await expect(
      staff.page.getByRole("button", { name: "Mark verified" }),
    ).toHaveCount(left - 1);
  }
  await staff.page.getByRole("button", { name: "Approve" }).click();
  await expect(listingStatus(staff.page)).toHaveAttribute(
    "data-status",
    "APPROVED",
  );
  await expectNoSidewaysScroll(staff.page);
  await staff.context.close();

  await page.reload();
  await expect(listingStatus(page)).toHaveAttribute("data-status", "APPROVED");
});

test("finance staff are not offered the aircraft review", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "finance", "/admin");
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole("link", { name: "Operators" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Aircraft" })).toHaveCount(0);
});

test("operations release a registration claimed by a draft aircraft", async ({
  page,
  browser,
}) => {
  test.slow();
  await approvedOperator(page, browser);
  await page.goto("/operator/aircraft/new");
  const registration = `VT-${randomUUID().slice(0, 13).toUpperCase()}`;
  await page.getByRole("textbox", { name: "Registration" }).fill(registration);
  await page.getByRole("textbox", { name: "Manufacturer" }).fill("Airbus");
  await page.getByRole("textbox", { name: "Model" }).fill("H125");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Helicopter", exact: true }).click();
  await page.getByLabel("Passenger capacity").fill("5");
  await page.getByLabel("Range (km)").fill("600");
  await page.getByRole("textbox", { name: "Find the home base" }).fill("Juhu");
  await page.getByRole("combobox", { name: "Home base" }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: registration }),
  ).toBeVisible();
  const aircraftId = page.url().split("/").pop()!;

  const staff = await asStaff(browser);
  await staff.page.goto(`/admin/aircraft/${aircraftId}`);
  await staff.page
    .getByRole("button", { name: "Release registration" })
    .click();
  await staff.page
    .getByRole("textbox", { name: "Reason" })
    .fill("Registered by mistake; the owner will list it.");
  await staff.page
    .getByRole("dialog")
    .getByRole("button", { name: "Release registration" })
    .click();
  await expect(staff.page).toHaveURL(/\/admin\/aircraft$/);
  await expect(
    staff.page.getByRole("heading", { level: 1, name: "Aircraft" }),
  ).toBeVisible();
  await expect(staff.page.getByText("not found", { exact: false })).toHaveCount(
    0,
  );
  await staff.context.close();

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: registration }),
  ).toHaveCount(0);
});

test("a page address that is not an aircraft id is not found", async ({
  page,
}) => {
  await signIn(page, "ops", "/admin/aircraft/not-an-id");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /not found|cannot be found|doesn.t exist/i,
  );
});
