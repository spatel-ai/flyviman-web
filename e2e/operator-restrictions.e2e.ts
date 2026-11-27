import { expect, test } from "@playwright/test";
import { uniqueEmail } from "./support/api";
import { approvedAircraft, registerOperator } from "./support/operators";
import { setTime, expectTime } from "./support/pickers";

/** Operator and aircraft restrictions (M5 slice 4a). */

async function setRestrictions(
  section: ReturnType<import("@playwright/test").Page["getByRole"]>,
  page: import("@playwright/test").Page,
) {
  await setTime(section, "Earliest departure or arrival", "22:00");
  await setTime(section, "Latest departure or arrival", "06:00");
  await section.getByLabel("Notice (hours)").fill("2");
  await section.getByLabel("Notice (minutes)").fill("30");
  await section
    .getByRole("textbox", { name: "Find a location to exclude" })
    .fill("BOM");
  await section.getByRole("combobox", { name: "Add a location" }).click();
  await page.getByRole("option").first().click();
  await expect(section.getByRole("listitem")).toHaveCount(1);
  await section.getByRole("button", { name: "Save restrictions" }).click();
  await expect(page.getByText("Restrictions saved").first()).toBeVisible();
}

test("an operator administrator restricts an aircraft", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id } = await approvedAircraft(page, browser);
  await page.goto(`/operator/aircraft/${id}`);
  const section = page.getByRole("region", { name: "Restrictions" });
  await setRestrictions(section, page);
  await page.reload();
  await expectTime(section, "Earliest departure or arrival", "22:00");
  await expect(section.getByLabel("Notice (minutes)")).toHaveValue("30");
  await expect(section.getByRole("listitem")).toHaveCount(1);

  // Removing everything clears the restrictions.
  await section.getByRole("button", { name: /^Remove/ }).click();
  await setTime(section, "Earliest departure or arrival", "");
  await setTime(section, "Latest departure or arrival", "");
  await section.getByLabel("Notice (hours)").fill("");
  await section.getByLabel("Notice (minutes)").fill("");
  await section.getByRole("button", { name: "Save restrictions" }).click();
  await expect(page.getByText("Restrictions saved").first()).toBeVisible();
  await page.reload();
  await expect(section.getByLabel("Notice (hours)")).toHaveValue("");
});

test("restrictions explain what they need before they can be saved", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id } = await approvedAircraft(page, browser);
  await page.goto(`/operator/aircraft/${id}`);
  const section = page.getByRole("region", { name: "Restrictions" });
  await setTime(section, "Earliest departure or arrival", "06:00");
  await section.getByRole("button", { name: "Save restrictions" }).click();
  await expect(
    section.getByText("Set both the start and the end, or leave both empty."),
  ).toBeVisible();
});

test("an operator administrator restricts the whole organisation", async ({
  page,
  browser,
}) => {
  test.slow();
  await approvedAircraft(page, browser);
  await page.goto("/operator/pricing");
  const section = page.getByRole("region", { name: "Restrictions" });
  await setRestrictions(section, page);
  await page.reload();
  await expect(section.getByLabel("Notice (hours)")).toHaveValue("2");
});

test("an operator that is not approved sees the locked card, not a form that can only fail", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The navigation is a sheet on phones");
  await registerOperator(page, "Locked Wings Pvt Ltd", uniqueEmail("locked"));
  for (const path of [
    "/operator/aircraft/new",
    "/operator/empty-legs/new",
    "/operator/pricing",
    "/operator/availability",
    "/operator/team",
  ]) {
    await page.goto(path);
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "Available once you are approved" }),
      path,
    ).toBeVisible();
    await expect(
      main.getByRole("link", { name: "Company and documents" }),
    ).toBeVisible();
    await expect(main.getByRole("form")).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Save" })).toHaveCount(0);
    await expect(
      page
        .getByRole("navigation", { name: "Operator navigation" })
        .locator('[aria-current="page"]'),
    ).toHaveCount(0);
  }
});
