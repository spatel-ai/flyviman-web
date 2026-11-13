import { expect, test, type Page } from "@playwright/test";

/**
 * Motion on the customer site (docs/frontend/motion-design.md): the header
 * hairline and pointer feedback (level 1), page cross-fades (level 3),
 * section reveals and the home page intro (level 4), scroll-linked motion
 * (level 5), and that reduced motion and layout stability are respected.
 */

async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top }), y);
}

test.describe("header", () => {
  test("gains its hairline once the page scrolls, and loses it at the top", async ({
    page,
  }) => {
    await page.goto("/");
    const root = page.locator("html");
    await expect(root).not.toHaveAttribute("data-scrolled");

    await scrollTo(page, 400);
    await expect(root).toHaveAttribute("data-scrolled");

    await scrollTo(page, 0);
    await expect(root).not.toHaveAttribute("data-scrolled");
  });
});

test.describe("section reveals", () => {
  test("content below the screen waits, then rises in when scrolled to", async ({
    page,
  }) => {
    await page.goto("/");
    const step = page
      .getByRole("heading", { level: 3, name: "Strong global network" })
      .locator("xpath=ancestor::*[@data-reveal][1]");

    await expect(step).toHaveAttribute("data-reveal", "waiting");
    await step.scrollIntoViewIfNeeded();
    await expect(step).toHaveAttribute("data-reveal", "shown");
    await expect
      .poll(() => step.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("1");
  });

  test("the air ambulance tile and its emergency notice are never animated", async ({
    page,
  }) => {
    await page.goto("/");
    const notice = page.getByText(/In an emergency, call 112/);

    await expect(notice.locator("xpath=ancestor::*[@data-reveal]")).toHaveCount(
      0,
    );
    await notice.scrollIntoViewIfNeeded();
    await expect(notice).toBeVisible();
  });

  test("with reduced motion nothing is ever hidden", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator('[data-reveal="waiting"]')).toHaveCount(0);
    const opacities = await page
      .locator("[data-reveal]")
      .evaluateAll((elements) =>
        elements.map((el) => getComputedStyle(el).opacity),
      );
    expect(opacities.length).toBeGreaterThan(0);
    expect(new Set(opacities)).toEqual(new Set(["1"]));
  });

  test("loading and scrolling the home page shifts no layout", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const shifts: number[] = [];
      (window as unknown as { __shifts: number[] }).__shifts = shifts;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) shifts.push(entry.value);
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/");
    for (const y of [600, 1200, 1800, 2400, 3200, 4000, 4800]) {
      await scrollTo(page, y);
      await page.waitForTimeout(150);
    }
    // Let the last reveals finish.
    await page.waitForTimeout(900);

    const total = await page.evaluate(() =>
      (window as unknown as { __shifts: number[] }).__shifts.reduce(
        (sum, value) => sum + value,
        0,
      ),
    );
    // "Good" cumulative layout shift is below 0.1; motion must add none.
    expect(total).toBeLessThan(0.01);
  });
});

test.describe("page cross-fade", () => {
  test("moving between customer pages runs a view transition and keeps the header", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const started: number[] = [];
      (window as unknown as { __transitions: number[] }).__transitions =
        started;
      const original = document.startViewTransition?.bind(document);
      if (!original) return;
      document.startViewTransition = ((...args: unknown[]) => {
        started.push(Date.now());
        return (original as (...a: unknown[]) => ViewTransition)(...args);
      }) as typeof document.startViewTransition;
    });
    await page.goto("/");

    await page
      .getByRole("navigation", { name: "Footer" })
      .getByRole("link", { name: "Image credits" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Image credits" }),
    ).toBeVisible();

    const transitions = await page.evaluate(
      () =>
        (window as unknown as { __transitions: number[] }).__transitions.length,
    );
    expect(transitions).toBeGreaterThan(0);
    // The footer is shared by both pages: its scroll-linked wordmark is
    // measured again for the new, shorter page and still settles.
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight }),
    );
    await expect(page.locator(".site-footer__wordmark")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(
      page.getByRole("link", { name: "Flyviman home" }),
    ).toBeVisible();
  });
});

test.describe("home page intro", () => {
  const curtain = (page: Page) => page.locator(".intro-curtain");

  test("opens the page on a first visit, then leaves it clear", async ({
    page,
  }) => {
    await page.goto("/");

    // CSS only: it is there from the first paint and never takes a click.
    await expect(curtain(page)).toHaveCSS("position", "fixed");
    await expect(curtain(page)).toHaveCSS("pointer-events", "none");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(page.locator("html")).toHaveAttribute("data-intro-seen", "");
    await expect(curtain(page)).toBeHidden();
    // Every word of the headline has come to rest.
    const transforms = await page
      .locator(".intro-word > span")
      .evaluateAll((words) =>
        words.map((el) => getComputedStyle(el).transform),
      );
    expect(transforms).toHaveLength(7);
    expect(new Set(transforms)).toEqual(new Set(["none"]));
  });

  test("does not play again on a reload in the same visit", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-intro-seen", "");

    await page.reload();
    await expect(curtain(page)).toBeHidden();
    await expect(page.locator("html")).toHaveAttribute("data-intro-seen", "");
  });

  test("arriving from another page plays it once, and a reload does not repeat it", async ({
    page,
  }) => {
    await page.goto("/legal/image-credits");
    await page.getByRole("link", { name: "Flyviman home" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Your trusted partner/,
    );
    await expect(page.locator("html")).toHaveAttribute("data-intro-seen", "");

    await page.reload();
    // Set by the inline script before the first paint, from session storage.
    expect(
      await page.evaluate(() => sessionStorage.getItem("flyviman-intro")),
    ).toBe("1");
    await expect(curtain(page)).toBeHidden();
  });

  test("the headline is one sentence to a screen reader", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });

    await expect(heading).toHaveAccessibleName(
      "Your trusted partner for every aviation decision",
    );
    await expect(heading.locator("[aria-hidden] .intro-word")).toHaveCount(7);
  });

  test("is absent under reduced motion, and the hero stays still", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(curtain(page)).toBeHidden();
    await expect(page.locator(".hero-glint")).toBeHidden();
    await expect(page.locator(".hero-drift")).toHaveCSS(
      "animation-name",
      "none",
    );
  });

  test("the page is whole without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('[data-reveal="waiting"]')).toHaveCount(0);
    // The curtain's animation ends by itself, clipped away to nothing.
    await expect
      .poll(() => curtain(page).evaluate((el) => getComputedStyle(el).clipPath))
      .toBe("inset(50% 0px)");
    await page
      .getByRole("heading", {
        level: 3,
        name: "How can I request a quote or make a booking?",
      })
      .click();
    await expect(page.getByText("You can request a quote by:")).toBeVisible();
    await context.close();
  });
});

test.describe("slit reveal", () => {
  test("a section heading waits masked, then resolves fully", async ({
    page,
  }) => {
    await page.goto("/");
    const heading = page
      .getByRole("heading", {
        level: 2,
        name: "Your gateway to effortless luxury travel",
      })
      .locator("xpath=ancestor::*[@data-reveal-variant='slit'][1]");

    await expect(heading).toHaveAttribute("data-reveal", "waiting");
    await expect(heading).toHaveCSS("--slit", "0%");
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toHaveAttribute("data-reveal", "shown");
    await expect(heading).toHaveCSS("--slit", "100%");
    await expect(heading).toHaveCSS("transform", "none");
  });

  test("with reduced motion a heading carries no mask", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const masks = await page
      .locator('[data-reveal-variant="slit"]')
      .evaluateAll((elements) =>
        elements.map((el) => getComputedStyle(el).maskImage),
      );
    expect(masks.length).toBeGreaterThan(0);
    expect(new Set(masks)).toEqual(new Set(["none"]));
  });
});

test.describe("scroll-linked motion", () => {
  const wordmark = (page: Page) => page.locator(".site-footer__wordmark");

  test("the footer wordmark settles as it scrolls in, and scrolling stays native", async ({
    page,
  }) => {
    await page.goto("/");
    // GSAP loads once the page is idle and sets the starting state.
    await expect(wordmark(page)).toHaveCSS("opacity", "0.2");

    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight }),
    );
    await expect(wordmark(page)).toHaveCSS("opacity", "1");
    // The page really is at the bottom: nothing smoothed or held the scroll.
    const gap = await page.evaluate(
      () =>
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight -
        window.scrollY,
    );
    expect(Math.abs(gap)).toBeLessThanOrEqual(1);

    await scrollTo(page, 0);
    await expect(wordmark(page)).toHaveCSS("opacity", "0.2");
  });

  test("the hero's headline lifts as it scrolls away, and its action stays legible", async ({
    page,
  }) => {
    await page.goto("/");
    const block = page
      .getByRole("heading", { level: 1 })
      .locator("xpath=ancestor::div[1]");
    await expect(wordmark(page)).toHaveCSS("opacity", "0.2");
    await expect(block).toHaveCSS("opacity", "1");

    await scrollTo(page, 5000);
    await expect(block).toHaveCSS("opacity", "0.6");
    await scrollTo(page, 0);
    await expect(block).toHaveCSS("opacity", "1");
  });

  test("with reduced motion nothing follows the scroll", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(wordmark(page)).toHaveCSS("opacity", "1");
    await expect(wordmark(page)).not.toHaveAttribute("style", /.+/);
  });
});

test.describe("pointer feedback", () => {
  test("a service card leans to the pointer and settles back", async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Tilt needs a mouse or trackpad.",
    );
    await page.goto("/");
    const card = page
      .getByRole("heading", { level: 3, name: "Strong global network" })
      .locator("xpath=..");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveCSS("transform", "none");

    // Once the card has risen into place and the page has hydrated, the
    // pointer near its top-right corner tilts it. Retried, because either
    // can still be under way when the pointer first moves.
    await expect(async () => {
      const box = (await card.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.move(box.x + box.width - 8, box.y + 8);
      await expect
        .poll(
          () => card.evaluate((el) => (el as HTMLElement).style.transform),
          { timeout: 1000 },
        )
        .toMatch(/rotateX\(3\.\d+deg\) rotateY\(3\.\d+deg\)/);
    }).toPass({ timeout: 10_000 });

    await page.mouse.move(0, 0);
    await expect
      .poll(() => card.evaluate((el) => (el as HTMLElement).style.transform))
      .toBe("");
  });

  test("the air ambulance tile never leans", async ({ page }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Tilt needs a mouse or trackpad.",
    );
    await page.goto("/");
    const tile = page
      .getByText(/In an emergency, call 112/)
      .locator("xpath=ancestor::li[1]/div");
    await tile.scrollIntoViewIfNeeded();
    await tile.hover();
    await page.waitForTimeout(300);

    await expect(tile).toHaveCSS("transform", "none");
    await expect(tile).not.toHaveAttribute("style", /transform/);
  });
});
