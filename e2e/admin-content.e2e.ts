import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signIn } from "./support/api";

test("operations add, preview, publish and delete a banner", async ({
  page,
}) => {
  const headline = `Winter charter ${randomUUID().slice(0, 8)}`;
  await signIn(page, "ops", "/admin/content");
  await expect(
    page.getByRole("heading", { level: 1, name: "Content" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add banner" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Headline").fill(headline);
  await dialog.getByLabel("Message").fill("Fly Mumbai to Goa in comfort.");
  await dialog.getByRole("button", { name: "Preview" }).click();
  await expect(dialog.getByRole("region", { name: "Preview" })).toContainText(
    "Fly Mumbai to Goa in comfort.",
  );
  await dialog.getByRole("button", { name: "Save" }).click();

  const row = page.getByRole("row", { name: new RegExp(headline) });
  await expect(row.getByText("Draft")).toBeVisible();
  await page.getByRole("button", { name: `Publish ${headline}` }).click();
  await expect(row.getByText("Published")).toBeVisible();
  await page.getByRole("button", { name: `Unpublish ${headline}` }).click();
  await expect(row.getByText("Draft")).toBeVisible();

  await page.getByRole("button", { name: `Delete ${headline}` }).click();
  await page.getByRole("button", { name: "Delete banner" }).click();
  await expect(row).toHaveCount(0);
});

test("operations see the policies but cannot publish a version", async ({
  page,
}) => {
  await signIn(page, "ops", "/admin/content?tab=policies");
  await expect(page.getByRole("row", { name: /Terms of use/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /New version/ })).toHaveCount(
    0,
  );
});

test("a super admin keeps placeholders when editing a template", async ({
  page,
}) => {
  await signIn(page, "superAdmin", "/admin/content?tab=templates");
  await page
    .getByRole("button", { name: "Edit customer.welcome EMAIL" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Required: {{firstName}}")).toBeVisible();
  await dialog.getByLabel("Message").fill("Hello there.");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("alert")).toContainText("{{firstName}}");
});

test("a super admin publishes a new policy version", async ({ page }) => {
  await signIn(page, "superAdmin", "/admin/content?tab=policies");
  const row = page.getByRole("row", { name: /Privacy policy/ });
  await row.getByRole("button", { name: /New version/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Text")
    .fill(`Privacy wording ${randomUUID().slice(0, 8)}.`);
  await dialog.getByRole("button", { name: "Publish new version" }).click();
  await expect(page.getByText(/Published version/).first()).toBeVisible();
});
