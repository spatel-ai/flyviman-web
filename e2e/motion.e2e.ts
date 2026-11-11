import { expect, test, type Page } from "@playwright/test";

/**
 * Motion on the customer site (M2, docs/frontend/motion-design.md): the
 * header hairline (level 1), page cross-fades (level 3) and section reveals
 * (level 4), and that reduced motion and layout stability are respected.
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
      .getByRole("heading", { level: 3, name: "Fly", exact: true })
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
    for (const y of [600, 1200, 1800, 2400, 3200]) {
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
    await expect(
      page.getByRole("link", { name: "Flyviman home" }),
    ).toBeVisible();
  });
});

test.describe("story section (From search to sky)", () => {
  const section = (page: Page) =>
    page.locator("section", {
      has: page.getByRole("heading", { level: 2, name: "From search to sky" }),
    });
  const steps = (page: Page) => section(page).locator(".route-story__step");
  const opacities = (page: Page) =>
    steps(page).evaluateAll((elements) =>
      elements.map(
        (el) => Math.round(Number(getComputedStyle(el).opacity) * 10) / 10,
      ),
    );
  const wipeScale = (page: Page) =>
    section(page)
      .locator(".route-story__wipe")
      .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

  /** Scrolls so that `progress` (0 to 1) of the pinned range has passed. */
  async function scrollThrough(page: Page, progress: number) {
    await page.evaluate((p) => {
      const el = document.querySelector(".route-story") as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const range = el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + range * p });
    }, progress);
  }

  test("on a wide screen it is pinned while the arc draws and the steps light up in turn", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await scrollThrough(page, 0);
    await expect.poll(() => wipeScale(page)).toBeGreaterThan(0.9);
    await expect.poll(() => opacities(page)).toEqual([0.4, 0.4, 0.4, 0.4]);

    await scrollThrough(page, 0.35);
    await expect
      .poll(async () => (await opacities(page)).map((o) => o === 1))
      .toEqual([true, true, false, false]);
    const heading = section(page).getByRole("heading", { level: 2 });
    await expect(heading).toBeInViewport();

    await scrollThrough(page, 1);
    await expect.poll(() => wipeScale(page)).toBeLessThan(0.05);
    await expect.poll(() => opacities(page)).toEqual([1, 1, 1, 1]);

    // Scrolling back undoes it.
    await scrollThrough(page, 0);
    await expect.poll(() => opacities(page)).toEqual([0.4, 0.4, 0.4, 0.4]);
  });

  test("on a phone it is a plain section with everything shown", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(section(page).locator(".route-story__wipe")).toBeHidden();
    await section(page).scrollIntoViewIfNeeded();
    await expect.poll(() => opacities(page)).toEqual([1, 1, 1, 1]);
  });

  test("with reduced motion it shows its final state and is not pinned", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(section(page).locator(".route-story__wipe")).toBeHidden();
    const height = await section(page).evaluate(
      (el) => (el as HTMLElement).offsetHeight,
    );
    expect(height).toBeLessThan(800 * 1.5);
    await expect.poll(() => opacities(page)).toEqual([1, 1, 1, 1]);
  });
});
