import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll, signIn, uniqueEmail } from "./support/api";

test("operations can add a landing site and deactivate it from search", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "ops", "/admin/locations");
  await expect(
    page.getByRole("heading", { level: 1, name: "Locations" }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  const name = `Kedarnath test ${uniqueEmail("loc").split("@")[0]}`;
  await page.getByRole("button", { name: "Add location" }).click();
  const dialog = page.getByRole("dialog", { name: "Add location" });
  await dialog.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Landing site" }).click();
  await dialog.getByRole("textbox", { name: "Name" }).fill(name);
  await dialog.getByRole("textbox", { name: "City" }).fill("Kedarnath");
  await dialog.getByRole("textbox", { name: "State" }).fill("Uttarakhand");
  await dialog.getByLabel("Latitude").fill("30.7346");
  await dialog.getByLabel("Longitude").fill("79.0669");
  await dialog
    .getByRole("checkbox", {
      name: "Set default landing, parking and handling charges",
    })
    .check();
  await dialog.getByLabel("Landing (₹)").fill("5000");
  await dialog.getByLabel("Parking (₹)").fill("1000");
  await dialog.getByLabel("Handling (₹)").fill("2500");
  await dialog.getByRole("button", { name: "Add location" }).click();
  await expect(
    page.getByText("Location added", { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("textbox", { name: "Search" }).fill(name);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "₹5,000" })).toBeVisible();

  await page
    .getByRole("row")
    .filter({ hasText: name })
    .getByRole("button", { name: "Edit" })
    .click();
  const edit = page.getByRole("dialog", { name: "Edit location" });
  await edit
    .getByRole("checkbox", { name: "Active (shown in search and bookable)" })
    .uncheck();
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Location updated", { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Inactive" }).click();
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();

  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await expect(
    page
      .getByRole("navigation", { name: "Admin navigation" })
      .getByRole("link", { name: "Locations" }),
  ).toBeVisible();
});

test("finance staff are not offered the locations section", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "finance", "/admin");
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole("link", { name: "Operators" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Locations" })).toHaveCount(0);
});
