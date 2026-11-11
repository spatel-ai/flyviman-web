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

test.describe("customer home, photography and footer", () => {
  test("every photograph has a description and the hero has loaded", async ({
    page,
  }) => {
    await page.goto("/");

    const hero = page.getByRole("img", {
      name: "An aircraft wing above sunlit clouds",
    });
    await expect(hero).toBeVisible();
    await expect
      .poll(() => hero.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.locator("main img:not([alt])")).toHaveCount(0);
  });

  test("air ambulance points to emergency services", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(/In an emergency, call 112 or your local emergency/),
    ).toBeVisible();
  });

  test("the footer leads to the policies and the image credits", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("navigation", { name: "Footer" });

    await expect(footer.getByRole("link", { name: "Terms" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
    await footer.getByRole("link", { name: "Image credits" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Image credits" }),
    ).toBeVisible();
    await expect(page.getByText(/Photograph by Ross Parmly/)).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Unsplash licence, for Ross Parmly's photograph",
      }),
    ).toHaveAttribute("href", "https://unsplash.com/license");
  });

  test("a signed-out visitor can switch theme from the footer", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("contentinfo")
      .getByRole("radio", { name: "Dark" })
      .click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
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
