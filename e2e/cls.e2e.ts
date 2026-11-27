import { expect, test, type Page } from "@playwright/test";
import {
  listedJet,
  newCustomer,
  requestThroughApi,
  searchFor,
} from "./support/bookings";

/**
 * Cumulative layout shift of the pages that loaded their data into a smaller
 * placeholder (UX audit L-002, R17). Production build, measured after the
 * network goes idle; "good" is under 0.1. Run on the desktop and mobile
 * projects.
 */

interface Shift {
  value: number;
  start: number;
  sources: string[];
}

/** Records every layout shift (and what moved) from before the page's own scripts run. */
async function watchShifts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __shifts: Shift[] };
    w.__shifts = [];
    const name = (node: Node | null) => {
      const el = node as Element | null;
      if (!el || !el.tagName) return "?";
      const cls = typeof el.className === "string" ? el.className : "";
      return `${el.tagName.toLowerCase()}.${cls.split(" ").slice(0, 3).join(".")}`;
    };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as unknown as {
          value: number;
          startTime: number;
          hadRecentInput: boolean;
          sources: { node: Node | null }[];
        };
        if (shift.hadRecentInput) continue;
        w.__shifts.push({
          value: shift.value,
          start: shift.startTime,
          sources: shift.sources.map((s) => name(s.node)),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

/** The worst session window (shifts less than 1 s apart, at most 5 s long): the CLS web vitals report. */
function worstWindow(shifts: Shift[]): number {
  let worst = 0;
  let sum = 0;
  let first = 0;
  let last = 0;
  for (const shift of shifts) {
    if (sum > 0 && (shift.start - last > 1000 || shift.start - first > 5000)) {
      sum = 0;
    }
    if (sum === 0) first = shift.start;
    sum += shift.value;
    last = shift.start;
    worst = Math.max(worst, sum);
  }
  return worst;
}

async function measure(page: Page, path: string, ready: () => Promise<void>) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await ready();
  await page.waitForTimeout(1500);
  const shifts = await page.evaluate(
    () => (window as unknown as { __shifts: Shift[] }).__shifts,
  );
  const cls = worstWindow(shifts);
  console.log(
    `CLS ${path} ${cls.toFixed(3)} ${JSON.stringify(shifts.filter((s) => s.value > 0.005))}`,
  );
  return cls;
}

test("pages that load client data keep layout shift under 0.1", async ({
  browser,
}, info) => {
  test.slow();
  const { operator, aircraftId } = await listedJet(browser, true);
  const { page, passengerId } = await newCustomer(browser);
  const searched = await searchFor(page, aircraftId);
  const reference = await requestThroughApi(page, searched, passengerId);
  await watchShifts(page);
  await watchShifts(operator);

  const main = page.getByRole("main");
  const pages: [string, () => Promise<void>][] = [
    [
      `/search/${searched.searchId}`,
      () => expect(main.getByRole("heading").first()).toBeVisible(),
    ],
    [
      `/book/${searched.searchId}/${searched.resultId}`,
      () =>
        expect(
          main.getByRole("heading", { name: "Request this flight" }),
        ).toBeVisible(),
    ],
    [
      `/account/trips/${reference}`,
      () =>
        expect(
          main.getByRole("heading", { name: `Trip ${reference}` }),
        ).toBeVisible(),
    ],
    ["/account/air-ambulance", () => expect(main).toBeVisible()],
    ["/account", () => expect(main).toBeVisible()],
    ["/account/profile", () => expect(main).toBeVisible()],
  ];
  const results: Record<string, number> = {};
  for (const [path, ready] of pages) {
    results[path] = await measure(page, path, ready);
  }
  results["/operator/pricing"] = await measure(
    operator,
    "/operator/pricing",
    () => expect(operator.getByRole("main")).toBeVisible(),
  );

  info.annotations.push({ type: "cls", description: JSON.stringify(results) });
  for (const [path, cls] of Object.entries(results)) {
    expect(cls, `layout shift on ${path}`).toBeLessThan(0.1);
  }
});

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [390, 844],
] as const) {
  test(`the search landing does not shift while it loads at ${width} px (W1-011)`, async ({
    browser,
  }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL);
    const viewport = { width, height };

    // The page as it first paints: the streamed landing is not here yet, so
    // the fallback stands in. The sections below must start where they do
    // once the landing has arrived.
    const bare = await browser.newContext({
      baseURL,
      viewport,
      javaScriptEnabled: false,
    });
    const first = await bare.newPage();
    await first.goto("/search");
    const before = (await first.locator("#how-it-works").boundingBox())?.y;
    await bare.close();

    const context = await browser.newContext({ baseURL, viewport });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.assign(window, { shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) shifts.push(shift.value);
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/search");
    await expect(page.getByText("Popular routes")).toBeVisible();
    await page.waitForTimeout(1000);
    const after = (await page.locator("#how-it-works").boundingBox())?.y;
    const cls = await page.evaluate(() =>
      (window as unknown as { shifts: number[] }).shifts.reduce(
        (sum, value) => sum + value,
        0,
      ),
    );
    await context.close();

    expect(before).toBeDefined();
    // The fallback leaves the content below in the same place as the landing
    // does, within a few rows of text (the reserved boxes are estimates).
    expect(Math.abs((after ?? 0) - (before ?? 0))).toBeLessThan(
      Math.max(120, (after ?? 0) * 0.05),
    );
    expect(cls).toBeLessThan(0.1);
  });
}
