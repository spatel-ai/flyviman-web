import { expect, test } from "@playwright/test";
import { approvedAircraft } from "./support/operators";

/** Operator and aircraft restrictions (M5 slice 4a). */

async function setRestrictions(
  section: ReturnType<import("@playwright/test").Page["getByRole"]>,
  page: import("@playwright/test").Page,
) {
  await section.getByLabel("Earliest departure or arrival").fill("22:00");
  await section.getByLabel("Latest departure or arrival").fill("06:00");
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
  await expect(section.getByLabel("Earliest departure or arrival")).toHaveValue(
    "22:00",
  );
  await expect(section.getByLabel("Notice (minutes)")).toHaveValue("30");
  await expect(section.getByRole("listitem")).toHaveCount(1);

  // Removing everything clears the restrictions.
  await section.getByRole("button", { name: /^Remove/ }).click();
  await section.getByLabel("Earliest departure or arrival").fill("");
  await section.getByLabel("Latest departure or arrival").fill("");
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
  await section.getByLabel("Earliest departure or arrival").fill("06:00");
  await section.getByRole("button", { name: "Save restrictions" }).click();
  await expect(
    section.getByText("Set both the start and the end, or leave both empty."),
  ).toBeVisible();
});

// TODO(W1-4): enable once PUT /operator/restrictions is on main.
test.fixme("an operator administrator restricts the whole organisation", async ({
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
