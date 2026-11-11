import { expect, test } from "@playwright/test";

test.describe("customer home", () => {
  test("shows the headline and the five service categories", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /every way to fly/i }),
    ).toBeVisible();

    for (const category of [
      "Scheduled airlines",
      "Private charter",
      "Helicopter",
      "Empty-leg deals",
      "Air ambulance",
    ]) {
      await expect(
        page.getByRole("heading", { level: 3, name: category }),
      ).toBeVisible();
    }
  });

  test("does not scroll sideways", async ({ page }) => {
    await page.goto("/");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("portal shells", () => {
  for (const { path, title } of [
    { path: "/operator", title: "Operator portal · Flyviman" },
    { path: "/admin", title: "Admin portal · Flyviman" },
  ]) {
    test(`${path} renders its dashboard`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveTitle(title);
      await expect(
        page.getByRole("heading", { level: 1, name: "Dashboard" }),
      ).toBeVisible();
    });
  }
});

test.describe("themes", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`the page background follows the ${scheme} scheme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");

      const background = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );
      expect(background).toBe(
        scheme === "light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
      );
    });
  }
});

test("unknown pages answer 404", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
});
