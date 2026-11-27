import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./support/api";
import { requestedTrip } from "./support/requests";
import { completedPaidBooking, settlementFor } from "./support/paid-booking";

/**
 * Every portal list table fits its box on a desktop with no sideways scroll,
 * and no row wraps long text into a tall stack (owner rule, 2026-11-27: long
 * content is cut with an ellipsis; the full text is on the record's page).
 * Data has long names: the operator is "Skyline Aviation-<uuid>".
 */

const WIDTHS = [1280, 1440, 1680] as const;
/** A body row taller than this is long text wrapping (a price with its type badge is about 72). */
const MAX_ROW = 80;

const ADMIN = [
  "bookings",
  "enquiries",
  "air-ambulance",
  "change-requests",
  "operators",
  "aircraft",
  "users",
  "documents",
  "empty-legs",
  "payments",
  "refunds",
  "settlements",
  "reconciliation",
  "promotions",
  "pricing/rules",
  "pricing/calculations",
  "audit-logs",
  "locations",
];
const OPERATOR = [
  "bookings",
  "requests",
  "aircraft",
  "empty-legs",
  "settlements",
  "air-ambulance",
  "team",
];

export interface TableFit {
  name: string;
  overflow: number;
  tallestRow: number;
  rows: number;
}

/** Measures every visible table in the main region. */
export async function measureTables(page: Page): Promise<TableFit[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLTableElement>("main table")]
      .filter((t) => t.offsetParent !== null)
      .map((t) => {
        const box = t.parentElement as HTMLElement;
        const rows = [...t.querySelectorAll<HTMLElement>("tbody tr")];
        return {
          name: t.getAttribute("aria-label") ?? "(unnamed)",
          overflow: box.scrollWidth - box.clientWidth,
          tallestRow: Math.max(0, ...rows.map((r) => r.offsetHeight)),
          rows: rows.length,
        };
      }),
  );
}

const results: string[] = [];

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "Desktop widths only");

test("portal list tables fit at common desktop widths", async ({
  page,
  browser,
}) => {
  test.slow();
  test.setTimeout(900_000);
  const { reference } = await completedPaidBooking(browser);
  const operatorPage = await browser.newPage();
  await requestedTrip(operatorPage, browser, {
    priced: true,
    withPassenger: true,
  });

  const failures: string[] = [];
  async function sweep(p: Page, surface: string, paths: string[]) {
    for (const path of paths) {
      for (const width of WIDTHS) {
        await p.setViewportSize({ width, height: 900 });
        await p.goto(`/${surface}/${path}`);
        await expect(p.getByRole("main")).toBeVisible();
        await p.waitForLoadState("networkidle");
        await p.waitForTimeout(400);
        if ((await measureTables(p)).length === 0) {
          const line = `${surface}/${path} @${width}: no table (${(await p.getByRole("main").innerText()).slice(0, 60).replace(/\s+/g, " ")})`;
          results.push(line);
          console.log(line);
        }
        for (const fit of await measureTables(p)) {
          const line = `${surface}/${path} @${width} "${fit.name}": overflow ${fit.overflow}, tallest row ${fit.tallestRow}px, ${fit.rows} rows`;
          results.push(line);
          console.log(line);
          if (fit.overflow > 1 || fit.tallestRow > MAX_ROW) failures.push(line);
        }
      }
    }
  }

  await signIn(page, "superAdmin", "/admin");
  await expect(page).toHaveURL("/admin");
  await settlementFor(page, reference);
  await sweep(page, "admin", ADMIN);
  await sweep(operatorPage, "operator", OPERATOR);
  expect(failures).toEqual([]);
});
