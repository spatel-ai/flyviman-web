import { expect, test, type Page } from "@playwright/test";
import { fillAndSubmitSearch, seedOfferedAircraft } from "./support/search";

/**
 * /compare/home-v1: the home page as it was before the redesign, kept as a
 * frozen copy for comparison (features/home-v1). It must stay out of search
 * engines and behave as the old home page did.
 */

const canvas = (page: Page) => page.locator(".hero-v1-canvas");
const card = (page: Page) => page.locator(".hero-v1-card");

const scrollHero = (page: Page, fraction: number) =>
  page.evaluate((f) => {
    const el = document.querySelector<HTMLElement>(".hero-v1-track")!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + (el.offsetHeight - window.innerHeight) * f,
    });
  }, fraction);

test("shows the comparison note and asks search engines to stay away", async ({
  page,
}) => {
  await page.goto("/compare/home-v1");
  const note = page.getByTestId("compare-note");
  await expect(note).toContainText("Previous design, kept for comparison");
  await expect(note.getByRole("link")).toHaveAttribute("href", "/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /nofollow/,
  );
});

test("the film canvas is the top layer at the stage centre once live", async ({
  page,
}) => {
  await page.goto("/compare/home-v1");
  await expect(page.locator("html")).toHaveAttribute("data-hero-v1-film", "");
  await scrollHero(page, 0.3);
  await expect
    .poll(async () => Number(await canvas(page).getAttribute("data-frame")))
    .toBeGreaterThan(15);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const box = document
          .querySelector(".hero-v1-stage")!
          .getBoundingClientRect();
        const stack = document.elementsFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return stack
          .filter((el) => el.closest(".hero-v1-media"))
          .map((el) =>
            el instanceof HTMLCanvasElement ? "canvas" : "poster",
          )[0];
      }),
    )
    .toBe("canvas");
});

test("the card appears at the hold and its Search opens results", async ({
  page,
  browser,
}) => {
  test.slow();
  await seedOfferedAircraft(browser);
  await page.goto("/compare/home-v1");
  await expect(card(page)).toHaveCSS("opacity", "0");
  await scrollHero(page, 1);
  await expect(card(page)).toHaveCSS("opacity", "1");
  await fillAndSubmitSearch(page);
  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}$/);
  await expect(
    page
      .getByRole("list", { name: "Aircraft found" })
      .getByRole("listitem")
      .first(),
  ).toBeVisible();
});
