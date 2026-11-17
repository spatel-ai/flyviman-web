import { expect, test, type Page } from "@playwright/test";

/**
 * Motion on the customer site (docs/frontend/motion-design.md): the header
 * hairline and pointer feedback (level 1), page cross-fades (level 3),
 * section reveals (level 4), scroll-linked motion, and that reduced motion
 * and layout stability are respected. The home page hero is a still.
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
      .getByRole("heading", { level: 2, name: "Strong global network" })
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
    for (const y of [
      600, 1200, 1800, 2400, 3200, 4000, 4800, 6000, 7200, 8400, 9600, 10800,
    ]) {
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

test.describe("home page hero", () => {
  const root = (page: Page) => page.locator("html");
  const photo = (page: Page) => page.locator('img[src*="poster-first"]');
  const box = (page: Page) =>
    photo(page).locator("xpath=ancestor::div[@aria-hidden='true'][1]");

  test("is a still: the photograph sits in a fixed box and nothing moves", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(photo(page)).toBeVisible();
    // No film, no pinned stage and no clear header over it.
    await expect(root(page)).not.toHaveAttribute("data-hero-film");
    await expect(root(page)).not.toHaveAttribute("data-over-hero");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(photo(page)).toHaveCSS("animation-name", "none");
    await expect(box(page)).toHaveCSS("overflow", "hidden");
  });

  test("the photograph's box keeps its size while it loads", async ({
    page,
  }) => {
    await page.goto("/");
    const before = (await box(page).boundingBox())!;
    await expect
      .poll(() => photo(page).evaluate((img: HTMLImageElement) => img.complete))
      .toBe(true);
    const after = (await box(page).boundingBox())!;
    expect(after.height).toBe(before.height);
    expect(after.width).toBe(before.width);
  });

  test("keeps its headline, search card and photograph under reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(photo(page)).toBeVisible();
    await expect(page.getByRole("tablist")).toBeVisible();
  });

  test("the page is whole without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(photo(page)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('[data-reveal="waiting"]')).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Search charter" }),
    ).toBeVisible();
    await context.close();
  });

  test("the other marketing pages keep their photograph's slow drift", async ({
    page,
  }) => {
    await page.goto("/about");
    await expect(page.locator(".page-hero-drift")).toHaveCSS(
      "animation-name",
      "page-hero-drift",
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".page-hero-drift")).toHaveCSS(
      "animation-name",
      "none",
    );
  });
});

test.describe("slit reveal", () => {
  test("a section heading waits masked, then resolves fully", async ({
    page,
  }) => {
    await page.goto("/services");
    const heading = page
      .getByRole("heading", {
        level: 2,
        name: "All your queries in one place",
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
    await page.goto("/services");

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
    await page.goto("/services");
    const card = page
      .getByRole("heading", {
        level: 3,
        name: "What our sale & purchase service ensures",
      })
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
