import { expect, test } from "@playwright/test";

test.describe("customer home", () => {
  test("shows the headline and the five service categories", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Your trusted partner for every aviation decision",
      }),
    ).toBeVisible();

    const ways = page.locator("#ways-to-fly");
    for (const category of [
      "Scheduled airlines",
      "Private charter",
      "Helicopter",
      "Empty-leg deals",
      "Air ambulance",
    ]) {
      await expect(
        ways.getByRole("heading", { level: 3, name: category }),
      ).toBeVisible();
    }
  });

  test("carries the company's sections from flyviman.com", async ({ page }) => {
    await page.goto("/");

    for (const heading of [
      "Your strategic partner in the sky and on the ground.",
      "Fly without limits – where possibilities take flight",
      "Your gateway to effortless luxury travel",
      "All your queries in one place",
    ]) {
      await expect(
        page.getByRole("heading", { level: 2, name: heading }),
      ).toBeVisible();
    }
    for (const card of [
      "One-stop aviation hub",
      "Regulatory & operational expertise",
      "Celebrity charter",
      "Election charter",
    ]) {
      await expect(
        page.getByRole("heading", { level: 3, name: card }),
      ).toBeVisible();
    }
  });

  test("a question opens to its answer, one at a time", async ({ page }) => {
    await page.goto("/");
    const first = page.getByText("FlyViman delivers a complete range");
    const last = page.getByText("through approved agents in India");
    await expect(first).toBeHidden();

    await page
      .getByRole("heading", {
        level: 3,
        name: "What services does FlyViman provide?",
      })
      .click();
    await expect(first).toBeVisible();
    await expect(page.getByText("Professional drone operations")).toBeVisible();

    await page
      .getByRole("heading", {
        level: 3,
        name: "Does FlyViman offer private jet charters in India?",
      })
      .click();
    await expect(last).toBeVisible();
    await expect(first).toBeHidden();
  });

  test("claims the business has not confirmed are not shown", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText(/24\/7/)).toHaveCount(0);
    await expect(page.getByText(/transparent pricing/i)).toHaveCount(0);
  });

  test("does not scroll sideways", async ({ page }) => {
    await page.goto("/");
    // Scroll-linked motion sets its starting states once the page is idle.
    await expect(page.locator(".site-footer__wordmark")).toHaveCSS(
      "opacity",
      "0.2",
    );

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

    // The hero's own pictures are scenery, described once in words.
    const poster = page.locator(".hero-poster--first");
    await expect(poster).toHaveAttribute("alt", "");
    await expect
      .poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(
      page.getByText(/A view through a private jet window/),
    ).toBeAttached();
    await expect(page.locator("main img:not([alt])")).toHaveCount(0);
  });

  test("air ambulance points to emergency services", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(/In an emergency, call 112 or your local emergency/),
    ).toBeVisible();
  });

  test("the footer gives the office address, telephone and email", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");

    await expect(
      footer.getByText(/Dwarka Expressway, Sector 112/),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "+91 97799 20011" }),
    ).toHaveAttribute("href", "tel:+919779920011");
    await expect(
      footer.getByRole("link", { name: "+91 84471 73787" }),
    ).toHaveAttribute("href", "tel:+918447173787");
    await expect(
      footer.getByRole("link", { name: "info@flyviman.com" }),
    ).toHaveAttribute("href", "mailto:info@flyviman.com");
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
        name: "Unsplash licence, Ross Parmly's photograph",
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
