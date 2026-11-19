import { expect, test } from "@playwright/test";
import { expectNotCovered } from "./support/phone";

test.describe("customer home", () => {
  test("shows the headline, the charter search card and the categories", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Your trusted partner for every aviation decision",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Private jet", selected: true }),
    ).toBeVisible();

    const ways = page.locator("#ways-to-fly");
    for (const category of [
      "Private charter",
      "Helicopter",
      "Empty legs",
      "Scheduled flights",
      "Air ambulance",
    ]) {
      await expect(
        ways.getByRole("heading", { level: 3, name: category }),
      ).toBeVisible();
    }
    // Where each tile leads; every way to fly is live, so none says "Coming soon".
    for (const [name, href] of [
      ["Helicopter", "/search?service=helicopter"],
      ["Empty legs", "/empty-legs"],
      ["Scheduled flights", "/search?service=flights"],
      ["Air ambulance", "/search?service=air-ambulance"],
    ]) {
      await expect(
        ways.getByRole("link", { name: new RegExp(name) }),
      ).toHaveAttribute("href", href);
    }
    await expect(ways.getByText("Coming soon")).toHaveCount(0);
  });

  test("the booking card is visible when the film ends, clear of the tab bar", async ({
    page,
  }, info) => {
    await page.goto("/");
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight }),
    );
    const card = page.locator(".hero-card");
    await expect(card).toHaveCSS("opacity", "1");
    // From, To, Date, Travellers and Search all show.
    for (const name of [/^From:/, /^To:/, /^Departure:/, /^Travellers:/]) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }
    const search = card.getByRole("button", { name: "Search", exact: true });
    await expect(search).toBeVisible();
    if (info.project.name === "mobile") await expectNotCovered(search);
  });

  test("shows three of the company's claims, and no longer its About, Services or questions", async ({
    page,
  }) => {
    await page.goto("/");

    for (const point of [
      "One-stop aviation hub",
      "Strong global network",
      "Regulatory & operational expertise",
    ]) {
      await expect(
        page.getByRole("heading", { level: 2, name: point }),
      ).toBeVisible();
    }
    for (const gone of [
      "Your strategic partner in the sky and on the ground.",
      "Your gateway to effortless luxury travel",
      "All your queries in one place",
    ]) {
      await expect(page.getByRole("heading", { name: gone })).toHaveCount(0);
    }
  });

  test("a question on the Services page opens to its answer, one at a time", async ({
    page,
  }) => {
    await page.goto("/services");
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

  test("the claims approved in the full migration are shown", async ({
    page,
  }) => {
    await page.goto("/services");

    await expect(page.getByText("24/7 operations support")).toBeAttached();
    await expect(
      page.getByText("Transparent pricing", { exact: true }),
    ).toBeAttached();
  });

  test("does not scroll sideways", async ({ page }) => {
    await page.goto("/");
    // Scroll-linked motion sets its starting states once the page is idle;
    // below 768 px it does not run at all (CR-2).
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(page.locator(".site-footer__wordmark")).toHaveCSS(
        "opacity",
        "0.2",
      );
    }

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

    // The hero's picture is scenery: empty alt text, hidden from readers.
    const poster = page.locator('img[src*="poster-first"]');
    await expect(poster).toHaveAttribute("alt", "");
    await expect
      .poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
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

  test("the footer says it is powered by Technotribes", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    const credit = footer.getByRole("link", { name: /^Technotribes/ });

    await credit.scrollIntoViewIfNeeded();
    await expect(credit).toBeVisible();
    await expect(credit).toHaveAttribute("href", "https://technotribes.ai");
    await expect(credit).toHaveAttribute("target", "_blank");
    await expect(credit).toHaveAttribute("rel", /noopener/);
    await expect(footer).toContainText("Powered by Technotribes");
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
    test(`the page background follows the stored ${scheme} choice`, async ({
      page,
    }) => {
      await page.addInitScript((value) => {
        localStorage.setItem("flyviman-theme", value);
      }, scheme);
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
