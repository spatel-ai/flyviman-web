import { expect, test, type Page } from "@playwright/test";

/**
 * Motion on the customer site (docs/frontend/motion-design.md): the header
 * hairline and pointer feedback (level 1), page cross-fades (level 3),
 * section reveals (level 4), scroll-linked motion and the home page hero
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
  const track = (page: Page) => page.locator(".hero-track");
  const canvas = (page: Page) => page.locator(".hero-canvas");
  const heading = (page: Page) => page.getByRole("heading", { level: 1 });
  const action = (page: Page) =>
    track(page).getByRole("link", { name: "Explore ways to fly" });
  const headerGlass = (page: Page) =>
    page
      .locator(".site-header")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  /** Scrolls to a fraction of the hero's scroll distance. */
  const scrollHero = (page: Page, fraction: number) =>
    page.evaluate((f) => {
      const el = document.querySelector<HTMLElement>(".hero-track")!;
      window.scrollTo({ top: (el.offsetHeight - window.innerHeight) * f });
    }, fraction);
  const lastFrame = (page: Page) =>
    (page.viewportSize()?.width ?? 0) < 768 ? "79" : "117";
  const screens = (page: Page) =>
    track(page).evaluate((el) =>
      Math.round((el as HTMLElement).offsetHeight / window.innerHeight),
    );

  test("opens on the sky, behind a clear header, with the headline waiting", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(root(page)).toHaveAttribute("data-hero-film", "");
    expect(await screens(page)).toBe(lastFrame(page) === "79" ? 3 : 4);
    // It starts at the very top of the page, under the header.
    expect(
      await track(page).evaluate((el) => el.getBoundingClientRect().top),
    ).toBe(0);
    expect(await headerGlass(page)).toBe("rgba(0, 0, 0, 0)");
    await expect(canvas(page)).toHaveAttribute("data-frame", "0");
    await expect(page.getByText("Above it all")).toBeVisible();

    // Unseen until the film ends, but always there to read.
    await expect(heading(page)).toHaveCSS("opacity", "0");
    await expect(heading(page)).toHaveAccessibleName(
      "Your trusted partner for every aviation decision",
    );
    await expect(action(page)).toHaveAttribute("href", "#ways-to-fly");
  });

  test("the scroll plays the film to the cabin and back", async ({ page }) => {
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-frame", "0");
    const opening = page.locator(".hero-opening");

    await scrollHero(page, 0.5);
    await expect
      .poll(async () => Number(await canvas(page).getAttribute("data-frame")))
      .toBeGreaterThan(20);
    await expect(opening).toHaveCSS("opacity", "0");
    await expect(heading(page)).toHaveCSS("opacity", "0");
    // The stage is held: the track has moved, the canvas has not.
    expect(
      await canvas(page).evaluate((el) => el.getBoundingClientRect().top),
    ).toBe(0);

    await scrollHero(page, 1);
    await expect(canvas(page)).toHaveAttribute("data-frame", lastFrame(page));
    await expect(heading(page)).toHaveCSS("opacity", "1");
    await expect(page.locator(".hero-scrim")).toHaveCSS("opacity", "1");
    await expect(action(page)).toBeVisible();
    await expect(root(page)).toHaveAttribute("data-over-hero", "");

    await scrollHero(page, 0);
    await expect(canvas(page)).toHaveAttribute("data-frame", "0");
    await expect(heading(page)).toHaveCSS("opacity", "0");
    await expect(opening).toHaveCSS("opacity", "1");
  });

  test("the header is its usual bar again below the hero", async ({ page }) => {
    await page.goto("/");
    await expect(root(page)).toHaveAttribute("data-over-hero", "");

    await page.locator("#ways-to-fly").scrollIntoViewIfNeeded();
    await expect(root(page)).not.toHaveAttribute("data-over-hero");
    expect(await headerGlass(page)).not.toBe("rgba(0, 0, 0, 0)");

    await scrollTo(page, 0);
    await expect(root(page)).toHaveAttribute("data-over-hero", "");
  });

  test("the sky drifts only while the page rests at the top", async ({
    page,
  }) => {
    await page.goto("/");
    const media = page.locator(".hero-media");
    await expect(media).toHaveCSS("animation-name", "hero-drift");

    await scrollHero(page, 0.2);
    await expect(media).toHaveCSS("animation-name", "none");
    await expect(media).toHaveCSS("transform", "none");

    await scrollHero(page, 0);
    await expect(media).toHaveCSS("animation-name", "hero-drift");
  });

  test("a keyboard that reaches the button early is taken to it", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-frame", "0");

    await action(page).focus();
    await expect(action(page).locator("xpath=ancestor::div[1]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(action(page)).toBeFocused();
    const gap = await track(page).evaluate(
      (el) => el.getBoundingClientRect().bottom - window.innerHeight,
    );
    expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  });

  test("arriving by a link from another page starts the film too", async ({
    page,
  }) => {
    await page.goto("/legal/image-credits");
    await page.getByRole("link", { name: "Flyviman home" }).click();

    await expect(root(page)).toHaveAttribute("data-hero-film", "");
    await expect(canvas(page)).toHaveAttribute("data-frame", "0");

    // And leaving the home page gives the header back.
    await page.goBack();
    await expect(
      page.getByRole("heading", { level: 1, name: "Image credits" }),
    ).toBeVisible();
    await expect(root(page)).not.toHaveAttribute("data-over-hero");
    await expect(root(page)).not.toHaveAttribute("data-hero-film");
  });

  async function expectStill(page: Page) {
    await expect(root(page)).not.toHaveAttribute("data-hero-film");
    expect(await screens(page)).toBe(1);
    await expect(heading(page)).toBeVisible();
    await expect(heading(page)).toHaveCSS("opacity", "1");
    await expect(heading(page)).not.toHaveAttribute("style", /.+/);
    await expect(action(page)).toBeVisible();
    await expect(canvas(page)).toBeHidden();
    await expect(page.getByText("Above it all")).toBeHidden();
    // The cabin, not the sky.
    await expect(page.locator(".hero-poster--last")).toBeVisible();
    await expect(page.locator(".hero-poster--first")).toBeHidden();
    await expect(page.locator(".hero-scrim")).toHaveCSS("opacity", "1");
  }

  test("under reduced motion it is a still, one screen tall", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expectStill(page);
    await expect(page.locator(".hero-media")).toHaveCSS(
      "animation-name",
      "none",
    );
  });

  test("on a data-saver connection it is a still, and no frame is fetched", async ({
    page,
  }) => {
    const frames: string[] = [];
    page.on("request", (request) => {
      if (/\/hero\/.*\/frame-/.test(request.url())) frames.push(request.url());
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true },
        configurable: true,
      });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expectStill(page);
    expect(frames).toHaveLength(0);
  });

  test("the other marketing pages keep their photograph's slow drift", async ({
    page,
  }) => {
    await page.goto("/about");
    await expect(page.locator(".page-hero-drift")).toHaveCSS(
      "animation-name",
      "page-hero-drift",
    );
    await expect(root(page)).not.toHaveAttribute("data-over-hero");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".page-hero-drift")).toHaveCSS(
      "animation-name",
      "none",
    );
  });

  test("the page is whole without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expectStill(page);
    await expect(page.locator('[data-reveal="waiting"]')).toHaveCount(0);
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

test.describe("charter scenes showpiece", () => {
  const film = (page: Page) => page.locator(".scroll-film");
  const active = (page: Page) =>
    page.locator('.scroll-film__scene[data-film-active="true"] h3');

  /** Scrolls to a fraction (0 to 1) of the film's pinned range. */
  async function scrollFilm(page: Page, fraction: number) {
    await page.evaluate((f) => {
      const el = document.querySelector(".scroll-film") as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const header = 48;
      const start = top - header;
      const end = top + el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: start + (end - start) * f });
    }, fraction);
  }

  test("on a wide screen it pins and plays the scenes in turn, and reverses", async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "The film plays on wide screens.",
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(film(page)).toHaveAttribute("data-film", "on");

    await scrollFilm(page, 0.05);
    await expect(active(page)).toHaveText("Private charter");
    // Held below the header while it plays.
    const stageTop = () =>
      page
        .locator(".scroll-film__stage")
        .evaluate((el) => Math.round(el.getBoundingClientRect().top));
    await expect.poll(stageTop).toBe(48);

    await scrollFilm(page, 0.5);
    await expect(active(page)).toHaveText("Celebrity charter");
    await expect.poll(stageTop).toBe(48);

    // At a scene change the blinds are closed.
    await scrollFilm(page, 1 / 3);
    await expect
      .poll(() =>
        page
          .locator(".scroll-film__blind")
          .nth(7)
          .evaluate((el) => (el as HTMLElement).style.transform),
      )
      .toBe("scaleX(1)");

    await scrollFilm(page, 0.95);
    await expect(active(page)).toHaveText("Election charter");
    await expect(
      page.locator('.scroll-film__marker[aria-current="step"]'),
    ).toHaveCount(1);

    await scrollFilm(page, 0.05);
    await expect(active(page)).toHaveText("Private charter");
  });

  test("every scene stays reachable by keyboard and screen reader while it plays", async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "The film plays on wide screens.",
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(film(page)).toHaveAttribute("data-film", "on");

    // All three scenes are in the accessibility tree, not just the one on show.
    for (const name of [
      "Private charter",
      "Celebrity charter",
      "Election charter",
    ]) {
      await expect(
        film(page).getByRole("heading", { level: 3, name }),
      ).toBeAttached();
    }
    // Focusing a scene that is not on show brings it on show.
    await film(page)
      .getByRole("link", { name: "Send an enquiry about election charter" })
      .focus();
    await expect(active(page)).toHaveText("Election charter");
  });

  test("it turns on only while it is below the screen", async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "The film plays on wide screens.",
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    // Arrive with the section already on screen: it stays a plain section,
    // so the page does not grow under the visitor.
    await page.goto("/#charter-heading");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(film(page)).not.toHaveAttribute("data-film", "on");
  });

  test("on phones, under reduced motion and without JavaScript it is a plain section", async ({
    page,
    browser,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(film(page)).not.toHaveAttribute("data-film", "on");
    for (const name of [
      "Private charter",
      "Celebrity charter",
      "Election charter",
    ]) {
      await expect(
        film(page).getByRole("heading", { level: 3, name }),
      ).toBeVisible();
    }

    const context = await browser.newContext({ javaScriptEnabled: false });
    const plain = await context.newPage();
    await plain.goto("/");
    await expect(film(plain)).not.toHaveAttribute("data-film", "on");
    await expect(
      film(plain).getByRole("heading", { level: 3, name: "Election charter" }),
    ).toBeVisible();
    await context.close();
  });
});
