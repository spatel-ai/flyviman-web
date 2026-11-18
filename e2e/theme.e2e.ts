import { expect, test } from "@playwright/test";
import { signIn } from "./support/api";

// The platform is light by default, whatever the device prefers.
test.use({ colorScheme: "dark" });

const LIGHT_BACKGROUND = "rgb(255, 255, 255)";

async function expectLight(page: import("@playwright/test").Page) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const background = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(background).toBe(LIGHT_BACKGROUND);
}

test.describe("light by default", () => {
  test("the home page is light on a dark device", async ({ page }) => {
    await page.goto("/");
    await expectLight(page);
  });

  test("the sign-in page is light on a dark device", async ({ page }) => {
    await page.goto("/login");
    await expectLight(page);
  });

  test("the admin portal is light on a dark device", async ({ page }) => {
    await signIn(page, "superAdmin", "/admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/admin/);
    await expectLight(page);
  });

  test("choosing Dark in the footer persists across a reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("contentinfo")
      .getByRole("radio", { name: "Dark" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("contentinfo").getByRole("radio", { name: "Dark" }),
    ).toBeChecked();
  });
});
