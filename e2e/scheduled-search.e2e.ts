import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll } from "./support/api";

/**
 * Scheduled flights in the customer search (M6, web). The API half is built
 * separately (W2-2), so the results journeys answer the browser's calls with
 * the agreed contract; the one test against real results is fixme until
 * W2-2 is merged.
 */

const place = (code: string, city: string) => ({
  id: code,
  name: `${city} airport`,
  city,
  code,
  timeZone: "Asia/Kolkata",
});

function offer(
  id: string,
  opts: {
    carrier?: [string, string];
    price: number;
    depart: string;
    arrive: string;
    stops?: number;
    direction?: "OUTBOUND" | "RETURN";
    validUntil?: string;
  },
) {
  const [code, name] = opts.carrier ?? ["AI", "Air India"];
  const back = opts.direction === "RETURN";
  return {
    offerId: id,
    carrier: { code, name },
    segments: [
      {
        from: back ? place("GOI", "Goa") : place("BOM", "Mumbai"),
        to: back ? place("BOM", "Mumbai") : place("GOI", "Goa"),
        departAt: opts.depart,
        arriveAt: opts.arrive,
        flightNumber: `${code} ${id.length}${opts.price % 100}`,
        durationMinutes: 75,
      },
    ],
    direction: opts.direction ?? "OUTBOUND",
    stops: opts.stops ?? 0,
    fare: {
      amountMinor: opts.price,
      currency: "INR",
      priceType: "LIVE_FARE",
      fareFamily: "Saver",
    },
    baggage: { cabinKg: 7, checkedKg: 15 },
    refundable: id === "o-late",
    validUntil:
      opts.validUntil ?? new Date(Date.now() + 3_600_000).toISOString(),
  };
}

const future = (days: number, hourUtc: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
};

const RESULTS = {
  searchId: "s-1",
  partial: true,
  providers: [
    { name: "Mockair", status: "OK" },
    { name: "Slowjet", status: "TIMEOUT" },
  ],
  results: [
    // 07:30 IST, cheap, non-stop
    offer("o-early", {
      price: 450000,
      depart: future(5, 2),
      arrive: future(5, 4),
    }),
    // 20:00 IST, dearest, other airline, one stop
    offer("o-late", {
      carrier: ["6E", "IndiGo"],
      price: 900000,
      stops: 1,
      depart: future(5, 14),
      arrive: future(5, 18),
    }),
    offer("o-back", {
      price: 520000,
      direction: "RETURN",
      depart: future(8, 5),
      arrive: future(8, 7),
    }),
  ],
};

/** Answer the page's API calls for a scheduled search; pages themselves pass. */
async function mockScheduled(
  page: Page,
  handlers: {
    search?: unknown;
    status?: number;
    revalidate?: unknown;
  } = {},
) {
  await page.route(/\/search\/scheduled\//, async (route) => {
    const request = route.request();
    if (request.resourceType() === "document") return route.continue();
    const url = request.url();
    const ok = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(
          status === 200
            ? { data, meta: { requestId: null } }
            : { error: { code: "NOT_FOUND", message: "Search not found" } },
        ),
      });
    if (url.endsWith("/revalidate")) return ok(handlers.revalidate);
    if (url.includes("/fare-rules"))
      return ok({
        offerId: "x",
        rules: [
          { title: "Name changes", text: "Not permitted after ticketing." },
        ],
        cancellation: { refundable: false },
        change: { allowed: true, feeMinor: 250000 },
      });
    if (handlers.status && handlers.status !== 200)
      return ok(null, handlers.status);
    return ok(handlers.search ?? RESULTS);
  });
}

test("Scheduled flights is a search of its own, not a coming-soon enquiry", async ({
  page,
}) => {
  await page.goto("/search?service=flights");
  await expect(
    page.getByRole("tab", { name: /^Scheduled flights/, selected: true }),
  ).toBeVisible();
  await expect(page.getByText(/Scheduled flights are coming soon/)).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /^From:/ })).toBeVisible();
  await expect(page.getByLabel("Departure")).toBeVisible();
  const travellers = page.getByRole("button", { name: /^Travellers: 1 adult/ });
  await expect(travellers).toContainText("Economy");
  await expect(
    page.getByRole("button", { name: "Search flights" }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Cabin and every kind of passenger can be chosen.
  await travellers.click();
  await page.getByRole("button", { name: "One more children" }).click();
  await page.getByRole("button", { name: "One more infants" }).click();
  await page.getByRole("radio", { name: "Business" }).click();
  await page.getByRole("button", { name: "Done" }).first().click();
  await expect(
    page.getByRole("button", {
      name: /^Travellers: 1 adult, 1 child, 1 infant/,
    }),
  ).toContainText("Business");
});

test("results sort, filter, say when airlines were missing and keep outbound and return apart", async ({
  page,
}) => {
  await mockScheduled(page);
  await page.goto("/search/scheduled/s-1");

  await expect(
    page.getByRole("status").filter({ hasText: "Slowjet" }),
  ).toBeVisible();
  const outbound = page.getByRole("list", { name: "Outbound flights found" });
  const rows = outbound.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Air India");
  // Every price is labelled a live fare (rule 1).
  await expect(outbound.getByText("Live fare", { exact: true })).toHaveCount(2);
  await expect(
    page
      .getByRole("list", { name: "Return flights found" })
      .getByRole("listitem"),
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Earliest" }).click();
  await expect(rows.first()).toContainText("07:30");
  await page.getByRole("button", { name: "IndiGo", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("1 stop");
  await page.getByRole("button", { name: "Non-stop" }).click();
  await expect(
    page.getByText("No flights match these filters").first(),
  ).toBeVisible();
});

test("checking an offer shows a changed price, a sold-out flight and a confirmed one", async ({
  page,
}) => {
  await mockScheduled(page, {
    revalidate: {
      status: "PRICE_CHANGED",
      fare: { ...RESULTS.results[0].fare, amountMinor: 480000 },
      validUntil: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  await page.goto("/search/scheduled/s-1");
  await page
    .getByRole("button", { name: /^Details: Air India/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Name changes.")).toBeVisible();
  await expect(dialog.getByText("Not refundable")).toBeVisible();
  await dialog.getByRole("button", { name: "Check price and seats" }).click();
  await expect(dialog.getByText("The price has changed")).toBeVisible();
  await expect(dialog.getByText("₹4,500")).toBeVisible();
  await expect(dialog.getByText("₹4,800")).toBeVisible();
  await expect(
    dialog.getByText(/Booking scheduled flights opens soon/),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Book/ })).toHaveCount(0);
  await expect(
    dialog.getByRole("link", { name: "Send an enquiry" }),
  ).toHaveAttribute("href", /\/contact\?topic=/);
});

test("a sold-out flight offers the alternatives", async ({ page }) => {
  await mockScheduled(page, { revalidate: { status: "SOLD_OUT" } });
  await page.goto("/search/scheduled/s-1");
  await page
    .getByRole("button", { name: /^Details: Air India/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Check price and seats" }).click();
  await expect(dialog.getByText("No seats left on this fare")).toBeVisible();
  await expect(dialog.getByRole("button", { name: /IndiGo/ })).toBeVisible();
  await dialog.getByRole("button", { name: /IndiGo/ }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: /IndiGo/ }),
  ).toBeVisible();
});

test("expired fares are not offered and the visitor is told to search again", async ({
  page,
}) => {
  const past = new Date(Date.now() - 60_000).toISOString();
  await mockScheduled(page, {
    search: {
      ...RESULTS,
      partial: false,
      results: RESULTS.results.map((o) => ({ ...o, validUntil: past })),
    },
  });
  await page.goto("/search/scheduled/s-1");
  await expect(
    page.getByRole("alert").filter({ hasText: "These fares have expired" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Fare expired/ }).first(),
  ).toBeDisabled();
});

test("a search that has gone says so", async ({ page }) => {
  await mockScheduled(page, { status: 404 });
  await page.goto("/search/scheduled/s-gone");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/expired/i);
  await expect(
    page.getByRole("link", { name: "Search again" }),
  ).toHaveAttribute("href", "/search?service=flights");
});

test.fixme("a scheduled search against the real API returns labelled live fares (W2-2)", async () => {
  // Needs POST /search/scheduled from W2-2 and the mock airline provider:
  // fill From, To, Departure, Search flights, then open a result and check it.
});
