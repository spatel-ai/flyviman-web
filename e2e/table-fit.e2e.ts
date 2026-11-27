import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { API_URL, signIn, uniqueEmail } from "./support/api";
import { asStaff, csrf } from "./support/operators";
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
  "notifications",
  "matching-limits",
  "content",
  "roles",
];
const OPERATOR = [
  "bookings",
  "requests",
  "aircraft",
  "empty-legs",
  "settlements",
  "air-ambulance",
  "team",
  "notifications",
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

/** A card list: no card wraps long text into a runaway stack or spills sideways. */
const MAX_CARD = 180;

export async function measureCards(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main ul > li")]
      .filter((li) => li.offsetParent !== null && li.offsetHeight > 40)
      .map((li) => ({
        overflow: li.scrollWidth - li.clientWidth,
        height: li.offsetHeight,
      })),
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
  // The first operator has a completed, settled booking; the second has an
  // open request (and, with its customer's change request, one for admin).
  const { reference, operator: paidOperator } = await completedPaidBooking(
    browser,
    { keepOperator: true },
  );
  const operatorPage = await browser.newPage();
  await requestedTrip(operatorPage, browser, {
    priced: true,
    withPassenger: true,
    changeRequest: "Please move the departure two hours later, and add a stop",
    // Nine digits before the decimals: real amounts are longer than test ones.
    hourlyRateMinor: 4_000_000_000,
  });

  // Long values on the pages that only show the problem with data.
  for (const operator of [operatorPage, paidOperator]) {
    const invited = await operator.request.post(`${API_URL}operator/staff`, {
      headers: await csrf(operator),
      data: {
        email: uniqueEmail("long-team-member"),
        allAircraft: true,
        aircraftIds: [],
        capabilities: [
          "MANAGE_AIRCRAFT",
          "MANAGE_AVAILABILITY",
          "MANAGE_EMPTY_LEGS",
          "MANAGE_BOOKINGS",
        ],
      },
    });
    expect(invited.status()).toBe(201);
  }

  const finance = await asStaff(browser, "finance");
  const day = 86_400_000;
  const promotion = await finance.page.request.post(
    `${API_URL}admin/promotions`,
    {
      headers: await csrf(finance.page),
      data: {
        code: `LONG${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
        name: "Monsoon festival launch offer for returning charter flyers",
        kind: "PERCENT",
        percent: 5,
        currency: "INR",
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 30 * day).toISOString(),
        reason: "Table fit test",
      },
    },
  );
  expect(promotion.status()).toBe(201);
  await finance.context.close();

  // An air ambulance request, seen in the admin queue.
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await signIn(customerPage, "customer", "/account");
  await expect(customerPage).toHaveURL(/\/account/);
  const places = (
    await (await customerPage.request.get(`${API_URL}locations`)).json()
  ).data as { id: string }[];
  const ambulance = await customerPage.request.post(
    `${API_URL}air-ambulance/requests`,
    {
      headers: {
        ...(await csrf(customerPage)),
        "Idempotency-Key": randomUUID(),
      },
      data: {
        contactName: "Asha Rao",
        contactPhone: "+919800000001",
        originLocationId: places[0].id,
        destinationLocationId: places[1].id,
        preferredAt: new Date(Date.now() + 2 * day).toISOString(),
        patientCount: 1,
        accompanyingPersons: 0,
        medical: {
          patientCondition: "Needs transfer for ongoing care",
          mobility: "NON_AMBULATORY",
          stretcherRequired: true,
          oxygenRequired: false,
        },
      },
    },
  );
  expect(ambulance.status()).toBe(201);
  await customerContext.close();

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
        const cards = await measureCards(p);
        if (cards.length > 0) {
          const line = `${surface}/${path} @${width} cards: ${cards.length}, widest overflow ${Math.max(...cards.map((c) => c.overflow))}, tallest ${Math.max(...cards.map((c) => c.height))}px`;
          results.push(line);
          console.log(line);
          if (
            cards.some((c) => c.overflow > 1 || c.height > MAX_CARD) &&
            (await measureTables(p)).length === 0
          )
            failures.push(line);
        }
        if (surface === "admin" && path === "bookings" && width === 1280) {
          const geo = await p.evaluate(() => {
            const table = document.querySelector<HTMLTableElement>(
              'main table[aria-label="Bookings"]',
            );
            const box = table?.parentElement?.getBoundingClientRect();
            const cells = [
              ...(table?.querySelectorAll<HTMLElement>(
                "tbody tr:first-child td",
              ) ?? []),
            ];
            return {
              boxRight: box?.right ?? 0,
              tripWidth: cells[1]?.getBoundingClientRect().width ?? 0,
              priceRight: cells.at(-1)?.getBoundingClientRect().right ?? 0,
            };
          });
          const line = `admin/bookings @1280 trip ${Math.round(geo.tripWidth)}px, price right ${Math.round(geo.priceRight)} of ${Math.round(geo.boxRight)}`;
          results.push(line);
          console.log(line);
          if (geo.tripWidth < 280 || geo.priceRight > geo.boxRight)
            failures.push(line);
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
  await sweep(paidOperator, "operator", OPERATOR);
  expect(failures).toEqual([]);
});
