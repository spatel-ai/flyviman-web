import { expect, test, type Page } from "@playwright/test";

/**
 * Motion on the customer site (docs/frontend/motion-design.md): the header
 * hairline and pointer feedback (level 1), page cross-fades (level 3),
 * section reveals (level 4), scroll-linked motion, and that reduced motion
 * and layout stability are respected. The home page hero film plays
 * everywhere: the desktop set on wide screens, portrait sets on phones and
 * upright tablets (CR-2d).
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
  const track = (page: Page) => page.locator(".hero-track");
  const canvas = (page: Page) => page.locator(".hero-canvas");
  const card = (page: Page) => page.locator(".hero-card");
  const heading = (page: Page) => page.getByRole("heading", { level: 1 });
  const search = (page: Page) =>
    card(page).getByRole("button", { name: "Search", exact: true });
  /** Where the still hero is a band over the card (HERO.film.screens.phone). */
  const phoneStill = (page: Page) => {
    const size = page.viewportSize()!;
    return size.width < 744 || size.height < 600;
  };
  /** The desktop sequence's last frame (src/features/home/hero-frames.json). */
  const LAST_FRAME = 95;
  /**
   * Scrolls to a fraction of the hero's scroll distance: from the top of
   * the page to where the held stage lets go (its foot reaches the track's
   * foot), as the hero measures it.
   */
  const scrollHero = (page: Page, fraction: number) =>
    page.evaluate((f) => {
      const el = document.querySelector<HTMLElement>(".hero-track")!;
      const stage = document.querySelector<HTMLElement>(".hero-stage")!;
      const style = getComputedStyle(stage);
      const screen =
        style.position === "sticky"
          ? parseFloat(style.top) + stage.offsetHeight
          : window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + (el.offsetHeight - screen) * f });
    }, fraction);
  const frame = async (page: Page) =>
    Number(await canvas(page).getAttribute("data-frame"));

  /** The canvas paints above both posters while the film plays. */
  async function expectFilmOnTop(page: Page) {
    await page.goto("/");
    await scrollHero(page, 0.3);
    await expect
      .poll(async () => Number(await canvas(page).getAttribute("data-frame")))
      .toBeGreaterThan(15);
    // What paints at the stage's centre, topmost first: the canvas must be
    // above both posters (the headline and the card may be above it).
    await expect
      .poll(() =>
        page.evaluate(() => {
          const box = document
            .querySelector(".hero-stage")!
            .getBoundingClientRect();
          const stack = document.elementsFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          );
          return stack
            .filter((el) => el.closest(".hero-media"))
            .map((el) =>
              el instanceof HTMLCanvasElement ? "canvas" : "poster",
            )[0];
        }),
      )
      .toBe("canvas");
  }

  /** The card holds whole below the header (and above a tab bar). */
  async function expectCardHolds(page: Page) {
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-frame", "0");

    for (const fraction of [0.8, 0.95]) {
      await scrollHero(page, fraction);
      await expect(card(page)).toHaveCSS("opacity", "1");
      await expect(card(page)).toHaveCSS("pointer-events", "auto");
      await expect
        .poll(() =>
          page.evaluate(() => {
            const box = document
              .querySelector(".hero-card")!
              .getBoundingClientRect();
            const header = document
              .querySelector("header.site-header")!
              .getBoundingClientRect().bottom;
            // The tab bar shows below 768 px only.
            const bar = document.querySelector<HTMLElement>(
              'nav[aria-label="Primary"]',
            );
            const floor =
              bar && getComputedStyle(bar).display !== "none"
                ? bar.getBoundingClientRect().top
                : window.innerHeight;
            return {
              belowHeader: box.top >= header - 0.5,
              aboveFloor: box.bottom <= floor + 0.5,
            };
          }),
        )
        .toEqual({ belowHeader: true, aboveFloor: true });
    }
    await expect(search(page)).toBeVisible();
    // The film kept up: it did not give way to the still.
    await expect(root(page)).not.toHaveAttribute("data-hero-too-slow");
  }

  test.describe("film", () => {
    test.skip(
      ({ isMobile }) => isMobile,
      "Phones get the still hero (HERO.film.phones is false)",
    );

    test("opens on the first frame with the headline showing and the card waiting", async ({
      page,
    }) => {
      await page.goto("/");

      await expect(root(page)).toHaveAttribute("data-hero-film", "");
      await expect(canvas(page)).toHaveAttribute("data-frame", "0");
      const screens = await track(page).evaluate(
        (el) => (el as HTMLElement).offsetHeight / window.innerHeight,
      );
      expect(screens).toBeCloseTo(2.8, 1);

      await expect(heading(page)).toBeVisible();
      await expect(heading(page)).toHaveAccessibleName(
        "Your trusted partner for every aviation decision",
      );
      // Unseen until the film ends, but always in the page.
      await expect(card(page)).toHaveCSS("opacity", "0");
      await expect(search(page)).toBeAttached();
    });

    test("the scroll plays the film, then the booking card rises over its last frame, and back", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(canvas(page)).toHaveAttribute("data-frame", "0");

      await scrollHero(page, 0.4);
      await expect
        .poll(async () => Number(await canvas(page).getAttribute("data-frame")))
        .toBeGreaterThan(20);
      await expect(card(page)).toHaveCSS("opacity", "0");
      // The stage is held: the track has moved, the canvas has not. Sticky
      // positioning can leave a sub-pixel offset, so "held" means the
      // canvas stays within the screen's first pixels below the header.
      const held = await canvas(page).evaluate(
        (el) => el.getBoundingClientRect().top,
      );
      expect(held).toBeLessThan(60);
      expect(held).toBeGreaterThan(40);

      await scrollHero(page, 1);
      await expect(canvas(page)).toHaveAttribute(
        "data-frame",
        String(LAST_FRAME),
      );
      await expect(card(page)).toHaveCSS("opacity", "1");
      await expect(card(page)).toHaveCSS(
        "transform",
        "matrix(1, 0, 0, 1, 0, 0)",
      );
      await expect(search(page)).toBeVisible();
      await expect(heading(page)).toBeVisible();

      await scrollHero(page, 0);
      await expect(canvas(page)).toHaveAttribute("data-frame", "0");
      await expect(card(page)).toHaveCSS("opacity", "0");
    });

    test("the visitor sees the film play, not a still over it", async ({
      page,
    }) => {
      await expectFilmOnTop(page);
    });

    test("the card holds whole below the header before the stage lets go", async ({
      page,
    }) => {
      await expectCardHolds(page);
    });

    test("the drawn frame keeps up with a wheel scroll", async ({ page }) => {
      await page.goto("/");
      // Every frame fetched, as for a visitor who has read the headline.
      await page.waitForLoadState("networkidle");
      await expect(canvas(page)).toHaveAttribute("data-frame", "0");
      await page.mouse.move(400, 400);

      /** The frame the scroll position asks for (timeline.frames 0 to 0.6). */
      const lag = () =>
        page.evaluate((last) => {
          const el = document.querySelector<HTMLElement>(".hero-track")!;
          const box = el.getBoundingClientRect();
          const progress = Math.min(
            1,
            Math.max(0, -box.top / (box.height - window.innerHeight)),
          );
          const target = Math.round(Math.min(1, progress / 0.6) * last);
          const drawn = Number(
            document.querySelector<HTMLElement>(".hero-canvas")!.dataset.frame,
          );
          return Math.abs(drawn - target);
        }, LAST_FRAME);

      // A mouse wheel's notches, down through the film and back up. After
      // each one the film has had time to settle (HERO.settleMs is 150; the
      // old 0.12 lerp is about 4 frames behind at this point).
      const lags: number[] = [];
      for (const direction of [1, -1]) {
        for (let notch = 0; notch < 12; notch += 1) {
          await page.mouse.wheel(0, direction * 120);
          await page.waitForTimeout(200);
          lags.push(await lag());
        }
      }
      expect(Math.max(...lags)).toBeLessThanOrEqual(2);
    });

    test("a keyboard that reaches the card early is taken to it", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(canvas(page)).toHaveAttribute("data-frame", "0");

      await page.getByRole("button", { name: /^From:/ }).focus();
      await expect(card(page)).toHaveCSS("opacity", "1");
      await expect(page.getByRole("button", { name: /^From:/ })).toBeFocused();
      await expect(canvas(page)).toHaveAttribute(
        "data-frame",
        String(LAST_FRAME),
      );
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

      // And leaving the home page leaves no film behind.
      await page.goBack();
      await expect(
        page.getByRole("heading", { level: 1, name: "Image credits" }),
      ).toBeVisible();
      await expect(root(page)).not.toHaveAttribute("data-hero-film");
    });
  });

  /** Every frame the page asked for, by set. */
  function frameRequests(page: Page) {
    const sets: string[] = [];
    page.on("request", (request) => {
      const match = /\/hero\/([^/]+)\/frame-/.exec(request.url());
      if (match) sets.push(match[1]);
    });
    return sets;
  }

  for (const size of [
    { width: 744, height: 1133 },
    { width: 820, height: 1180 },
  ]) {
    test.describe(`film on an upright tablet, ${size.width} by ${size.height}`, () => {
      test.skip(
        ({ isMobile }) => isMobile,
        "Run once, in the desktop project, at a portrait tablet's size",
      );
      test.use({ viewport: size });

      test("the visitor sees the portrait set play, not a still over it", async ({
        page,
      }) => {
        const sets = frameRequests(page);
        await expectFilmOnTop(page);
        await expect(root(page)).toHaveAttribute("data-hero-film", "");
        await expect(canvas(page)).toHaveAttribute(
          "data-set",
          "tablet-portrait",
        );
        expect(new Set(sets)).toEqual(new Set(["tablet-portrait"]));
      });

      test("the card holds whole below the header before the stage lets go", async ({
        page,
      }) => {
        await expectCardHolds(page);
      });
    });
  }

  test.describe("film on a tablet turned sideways", () => {
    test.skip(({ isMobile }) => isMobile, "Desktop project only");
    test.use({ viewport: { width: 820, height: 1180 } });

    test("changes to the desktop set and goes on playing", async ({ page }) => {
      await page.goto("/");
      await scrollHero(page, 0.3);
      await expect(canvas(page)).toHaveAttribute("data-set", "tablet-portrait");
      await page.setViewportSize({ width: 1180, height: 820 });
      await expect(canvas(page)).toHaveAttribute("data-set", "desktop");
      await scrollHero(page, 0.5);
      // The desktop set's frame for 0.5 of the way (0.5 / 0.6 of 95).
      await expect.poll(() => frame(page)).toBeGreaterThan(70);
    });
  });

  for (const size of [
    { width: 375, height: 667 },
    { width: 393, height: 852 },
    { width: 412, height: 915 },
  ]) {
    test.describe(`film on a phone, ${size.width} by ${size.height}`, () => {
      test.skip(({ isMobile }) => !isMobile, "Phones only");
      test.use({ viewport: size });

      test("plays the phone set, on top, with the scroll", async ({ page }) => {
        const sets = frameRequests(page);
        await expectFilmOnTop(page);
        await expect(canvas(page)).toHaveAttribute("data-set", "phone");
        const before = await frame(page);
        await scrollHero(page, 0.5);
        await expect.poll(() => frame(page)).toBeGreaterThan(before);
        await scrollHero(page, 0.1);
        await expect.poll(() => frame(page)).toBeLessThan(before);
        // Only phone frames: never the desktop or tablet sets.
        expect(sets.length).toBeGreaterThan(0);
        expect(new Set(sets)).toEqual(new Set(["phone"]));
      });

      test("opens on the wing", async ({ page }) => {
        await page.goto("/");
        await expect(canvas(page)).toHaveAttribute("data-frame", "0");
        // The focal path starts at 0.8 of the frame's width: the wing
        // crosses the slice's lower right, grey over orange clouds, and the
        // clouds fill its lower left. Share of light, nearly colourless
        // pixels in each patch (checked by eye on the frames).
        await expect
          .poll(() =>
            canvas(page).evaluate((el) => {
              const c = el as HTMLCanvasElement;
              const context = c.getContext("2d")!;
              const grey = (x: number) => {
                const { data } = context.getImageData(
                  Math.round(c.width * x),
                  Math.round(c.height * 0.8),
                  Math.round(c.width * 0.2),
                  Math.round(c.height * 0.1),
                );
                let count = 0;
                for (let i = 0; i < data.length; i += 4) {
                  const max = Math.max(data[i], data[i + 1], data[i + 2]);
                  const min = Math.min(data[i], data[i + 1], data[i + 2]);
                  if (max > 80 && (max - min) / max < 0.3) count += 1;
                }
                return count / (data.length / 4);
              };
              return { wing: grey(0.6) > 0.5, clouds: grey(0.05) < 0.3 };
            }),
          )
          .toEqual({ wing: true, clouds: true });
      });

      test("the card holds whole below the header and above the tab bar", async ({
        page,
      }) => {
        await expectCardHolds(page);
        // The headline has given way to the card.
        await expect(heading(page)).toHaveCSS("opacity", "0");
      });

      test("a browser bar coming and going moves neither the stage nor the film", async ({
        page,
      }) => {
        await page.goto("/");
        await scrollHero(page, 0.3);
        await expect.poll(() => frame(page)).toBeGreaterThan(15);
        const stageTop = () =>
          page
            .locator(".hero-stage")
            .evaluate((el) => el.getBoundingClientRect().top);
        const held = await stageTop();
        for (const change of [60, -60]) {
          await page.setViewportSize({
            width: size.width,
            height: size.height + change,
          });
          await expect.poll(stageTop).toBe(held);
          await expect(root(page)).toHaveAttribute("data-hero-film", "");
        }
        const before = await frame(page);
        await scrollHero(page, 0.5);
        await expect.poll(() => frame(page)).toBeGreaterThan(before);
      });
    });
  }

  test.describe("film on a phone turned sideways", () => {
    test.skip(({ isMobile }) => !isMobile, "Phones only");

    test("keeps the phone set and goes on playing", async ({ page }) => {
      const sets = frameRequests(page);
      await page.goto("/");
      await expect(canvas(page)).toHaveAttribute("data-set", "phone");
      await page.setViewportSize({ width: 915, height: 412 });
      await expect(root(page)).toHaveAttribute("data-hero-film", "");
      await scrollHero(page, 0.3);
      await expect.poll(() => frame(page)).toBeGreaterThan(15);
      await expect(canvas(page)).toHaveAttribute("data-set", "phone");
      expect(new Set(sets)).toEqual(new Set(["phone"]));
    });
  });

  /**
   * The still hero, no film: on a phone the first frame as a band with
   * the card below; elsewhere the last frame with the card in place.
   */
  async function expectStill(page: Page) {
    await expect(root(page)).not.toHaveAttribute("data-hero-film");
    await expect(heading(page)).toBeVisible();
    await expect(card(page)).toBeVisible();
    await expect(card(page)).toHaveCSS("opacity", "1");
    await expect(search(page)).toBeVisible();
    await expect(canvas(page)).toBeHidden();
    const [shown, hidden] = phoneStill(page)
      ? [".hero-poster--first", ".hero-poster--last"]
      : [".hero-poster--last", ".hero-poster--first"];
    await expect(page.locator(shown)).toBeVisible();
    await expect(page.locator(hidden)).toBeHidden();
    // No scroll track: the hero is only as tall as its content.
    const screens = await track(page).evaluate(
      (el) => (el as HTMLElement).offsetHeight / window.innerHeight,
    );
    expect(screens).toBeLessThan(phoneStill(page) ? 1.6 : 1.1);
  }

  test("under reduced motion it is a still with the card in place", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expectStill(page);
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

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the page is whole", async ({ page }) => {
      await page.goto("/");

      await expectStill(page);
      await expect(page.locator('[data-reveal="waiting"]')).toHaveCount(0);
    });
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
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Phones get no scroll-linked motion.",
    );
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

  // Chunk names are hashed, so GSAP is recognised by its licence banner.
  async function gsapScripts(page: Page, visit: () => Promise<void>) {
    const pending: Promise<boolean>[] = [];
    page.on("response", (response) => {
      if (response.request().resourceType() !== "script") return;
      pending.push(
        response
          .text()
          .then((body) => body.includes("GreenSock"))
          .catch(() => false),
      );
    });
    await visit();
    return (await Promise.all(pending)).filter(Boolean).length;
  }

  test("GSAP loads on wide screens and never on a phone", async ({
    page,
  }, info) => {
    const loaded = await gsapScripts(page, async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await scrollTo(page, 3000);
      await page.waitForLoadState("networkidle");
    });
    if (info.project.name === "desktop") expect(loaded).toBeGreaterThan(0);
    else {
      expect(loaded).toBe(0);
      await expect(wordmark(page)).not.toHaveAttribute("style", /.+/);
    }
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

  test("on a phone a service card does not lean on pointer move", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "mobile", "Phone only.");
    await page.goto("/services");
    await page.waitForLoadState("networkidle");
    const card = page
      .getByRole("heading", {
        level: 3,
        name: "What our sale & purchase service ensures",
      })
      .locator("xpath=..");
    await card.scrollIntoViewIfNeeded();
    const box = (await card.boundingBox())!;
    await card.dispatchEvent("pointermove", {
      clientX: box.x + box.width - 8,
      clientY: box.y + 8,
    });
    await page.mouse.move(box.x + box.width - 8, box.y + 8);

    await expect(card).toHaveCSS("transform", "none");
    await expect(card).not.toHaveAttribute("style", /transform/);
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
