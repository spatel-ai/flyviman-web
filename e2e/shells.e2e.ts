import { expect, test, type Locator, type Page } from "@playwright/test";
import { signIn } from "./support/api";
import { approvedOperator } from "./support/operators";
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

/**
 * Waits until no finite animation or transition is running (colour fades on
 * nav links, reveals), so axe measures the settled colours. Endless ones,
 * such as a hero's slow drift, are left out: they never finish.
 */
async function waitForAnimations(page: import("@playwright/test").Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getComputedTiming().endTime === Infinity,
      ),
  );
}

/** Runs axe on the page as it is now and returns the failing rules. */
async function axeViolations(
  page: import("@playwright/test").Page,
  rules: string[],
) {
  await page.addScriptTag({ path: require.resolve("axe-core") });
  return page.evaluate(async (ruleIds) => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: unknown,
            options: unknown,
          ) => Promise<{
            violations: { id: string; nodes: { target: unknown[] }[] }[];
          }>;
        };
      }
    ).axe;
    // The footer wordmark is a decorative watermark (aria-hidden) that fades
    // in on scroll; axe still measures it at its starting opacity.
    const result = await axe.run(
      { exclude: [[".site-footer__wordmark"]] },
      {
        runOnly: { type: "rule", values: ruleIds },
      },
    );
    return result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => String(node.target)),
    }));
  }, rules);
}

test.describe("accessibility (axe)", () => {
  const ARIA = [
    "aria-valid-attr-value",
    "aria-required-children",
    "aria-hidden-focus",
  ];

  test("operator tabs and the open account menu pass the ARIA rules", async ({
    page,
    browser,
  }) => {
    test.slow();
    // Its own approved operator: the seeded one's approval state depends on
    // the database, and an unapproved one sees the locked card, not the tabs.
    await approvedOperator(page, browser);
    await page.goto("/operator/availability");
    await expect(page.getByRole("tab", { name: "Week" })).toBeVisible();
    expect(await axeViolations(page, ARIA)).toEqual([]);

    await expect(async () => {
      await page.getByRole("button", { name: "Account menu" }).click();
      await expect(page.getByRole("menu")).toBeVisible({ timeout: 2000 });
    }).toPass();
    expect(await axeViolations(page, ARIA)).toEqual([]);

    // The theme choice stays a keyboard-operable part of the menu.
    await page.getByRole("menuitemradio", { name: "Dark" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("menu")).toBeVisible();
  });

  test("the sign-in tabs pass the ARIA rules and the panel is not a tab stop", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("tab", { name: "Email" })).toBeVisible();
    expect(await axeViolations(page, ARIA)).toEqual([]);
    await expect(page.getByRole("tabpanel")).toHaveAttribute("tabindex", "-1");
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`badges, tabs, nav and the footer have readable text in ${scheme}`, async ({
      page,
    }) => {
      await page.addInitScript((value) => {
        localStorage.setItem("flyviman-theme", value);
      }, scheme);
      await signIn(page, "superAdmin", "/admin/operators");
      await expect(page).toHaveURL(/\/admin\/operators$/);
      await expect(page.getByRole("tab").first()).toBeVisible();
      // The list has loaded: no skeleton rows, and a row or the empty state.
      await expect(page.locator("main [aria-busy]")).toHaveCount(0);
      await expect(
        page
          .locator("main tbody tr a")
          .or(page.getByText(/^No (.+ )?(operators|applications)/))
          .first(),
      ).toBeVisible();
      await waitForAnimations(page);
      expect(await axeViolations(page, ["color-contrast"])).toEqual([]);

      await page.goto("/");
      await expect(page.getByRole("tab", { selected: true })).toBeVisible();
      await waitForAnimations(page);
      expect(await axeViolations(page, ["color-contrast"])).toEqual([]);
    });
  }
});

test.describe("portal navigation categories", () => {
  /** The admin navigation: a sidebar, or the drawer on a phone. */
  async function adminNav(page: Page, isMobile: boolean) {
    if (isMobile) {
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    return page.getByRole("navigation", { name: "Admin navigation" });
  }

  const category = (nav: Locator, name: string) =>
    nav.getByRole("button", { name: new RegExp(`^${name}`) });

  /** A click before the page is interactive is lost: retry until it took. */
  async function toggle(button: Locator, expanded: boolean) {
    await expect(async () => {
      if ((await button.getAttribute("aria-expanded")) !== String(expanded)) {
        await button.click();
      }
      await expect(button).toHaveAttribute("aria-expanded", String(expanded), {
        timeout: 1000,
      });
    }).toPass();
  }

  test("the current page's category is open after a direct visit, and no other", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "superAdmin", "/admin/settlements");
    const nav = await adminNav(page, isMobile);
    await expect(category(nav, "Finance")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(
      nav.getByRole("link", { name: "Settlements" }),
    ).toHaveAttribute("aria-current", "page");
    for (const other of ["Operations", "Operators and fleet", "Pricing"]) {
      await expect(category(nav, other)).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
    // Dashboard and Reports stay plain links; nothing under a closed category shows.
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Locations" })).toHaveCount(0);
  });

  test("several categories stay open until closed by hand, and the current one is marked when closed", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "superAdmin", "/admin/locations");
    const nav = await adminNav(page, isMobile);
    const fleet = category(nav, "Operators and fleet");
    await expect(fleet).toHaveAttribute("aria-expanded", "true");

    await toggle(category(nav, "Finance"), true);
    await expect(fleet).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "Payments" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Locations" })).toBeVisible();

    await toggle(fleet, false);
    await expect(nav.getByRole("link", { name: "Locations" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Payments" })).toBeVisible();
    // The closed category that holds the current page says so.
    await expect(
      nav.getByRole("button", {
        name: "Operators and fleet, contains current page",
      }),
    ).toBeVisible();
    await expect(nav.getByTestId("nav-current-dot")).toHaveCount(1);

    await toggle(category(nav, "Finance"), false);
    await expect(nav.getByRole("link", { name: "Payments" })).toHaveCount(0);
  });

  test("open categories survive a reload", async ({ page, isMobile }) => {
    await signIn(page, "superAdmin", "/admin/locations");
    let nav = await adminNav(page, isMobile);
    await toggle(category(nav, "Finance"), true);
    await toggle(category(nav, "Pricing"), true);
    await page.reload();
    if (isMobile) await page.keyboard.press("Escape");
    nav = await adminNav(page, isMobile);
    for (const name of ["Operators and fleet", "Finance", "Pricing"]) {
      await expect(category(nav, name)).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    }
    await expect(category(nav, "Operations")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("under reduced motion a category opens and closes at once", async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, "superAdmin", "/admin");
    const nav = await adminNav(page, isMobile);
    const operations = category(nav, "Operations");
    await toggle(operations, true);
    const first = nav.getByRole("link", { name: "Bookings" });
    await expect(first).toBeVisible();
    const panel = nav.locator(".nav-panel").first();
    await expect(panel).not.toHaveCSS("transition-duration", "0.25s");
    await toggle(operations, false);
    await expect(first).toHaveCount(0);
  });

  test("following a link opens its category and leaves the others", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "superAdmin", "/admin");
    const nav = await adminNav(page, isMobile);
    await toggle(category(nav, "Finance"), true);
    await nav.getByRole("link", { name: "Payments" }).click();
    await expect(page).toHaveURL("/admin/payments");
    if (isMobile) {
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    await expect(category(nav, "Finance")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(nav.getByRole("link", { name: "Payments" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("a category opens with Enter and Space, and closed links are skipped by Tab", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "superAdmin", "/admin");
    const nav = await adminNav(page, isMobile);
    const operations = category(nav, "Operations");
    await expect(async () => {
      await operations.focus();
      await page.keyboard.press("Enter");
      await expect(operations).toHaveAttribute("aria-expanded", "true", {
        timeout: 1000,
      });
    }).toPass();
    await page.keyboard.press("Space");
    await expect(operations).toHaveAttribute("aria-expanded", "false");

    // Closed: the next stop is the next category, not a link inside this one.
    await operations.focus();
    await page.keyboard.press("Tab");
    await expect(category(nav, "Operators and fleet")).toBeFocused();

    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "Operators" })).toBeFocused();
  });

  test("the navigation passes the ARIA and contrast rules with a category open and with all closed", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "superAdmin", "/admin/locations");
    const nav = await adminNav(page, isMobile);
    const fleet = category(nav, "Operators and fleet");
    await expect(fleet).toHaveAttribute("aria-expanded", "true");
    await waitForAnimations(page);
    const rules = [
      "aria-valid-attr-value",
      "aria-required-children",
      "aria-hidden-focus",
      "color-contrast",
    ];
    expect(await axeViolations(page, rules)).toEqual([]);

    await toggle(fleet, false);
    await expect(nav.getByRole("link", { name: "Locations" })).toHaveCount(0);
    await waitForAnimations(page);
    expect(await axeViolations(page, rules)).toEqual([]);
  });
});
