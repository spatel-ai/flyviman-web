import { expect, test, type Page } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll } from "./support/api";

/**
 * Scheduled flights in the customer search (M6, web). The API half is built
 * separately (W2-2), so the results journeys answer the browser's calls with
 * the agreed contract; the one test against real results is fixme until
 * W2-2 is merged.
 */

const place = (code: string, city: string) => ({
  id: code,
  name: `${city} airport`,
  iata: code,
  icao: null,
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
  await expect(outbound.getByText("Total for all travellers")).toHaveCount(2);
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

/** A date in India `days` from today, YYYY-MM-DD. */
function inDays(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(Date.now() + days * 86_400_000),
  );
}

async function chooseAirport(page: Page, label: "From" | "To", iata: string) {
  const box = page.getByRole("combobox", {
    name: `Search ${label.toLowerCase()} airports`,
  });
  // A click before the page has hydrated does nothing: click until it opens.
  await expect(async () => {
    if (!(await box.isVisible()))
      await page
        .getByRole("button", { name: new RegExp(`^${label}:`) })
        .click();
    await expect(box).toBeVisible({ timeout: 1000 });
  }).toPass();
  await box.fill(iata);
  await page
    .getByRole("option", { name: new RegExp(iata) })
    .first()
    .click();
}

// The two projects run at once: each takes its own routes, so the airline
// mock's per-route behaviour of one cannot reach the other.
const ROUTES = {
  desktop: { search: ["DEL", "BLR"], partial: ["BOM", "DEL"] },
  mobile: { search: ["BOM", "BLR"], partial: ["BLR", "DEL"] },
} as const;

test("a scheduled search against the real API returns labelled live fares and rechecks one", async ({
  page,
}, testInfo) => {
  test.slow();
  const [from, to] = ROUTES[testInfo.project.name as "desktop"].search;
  await page.goto("/search?service=flights");
  await chooseAirport(page, "From", from);
  await chooseAirport(page, "To", to);
  await page.getByLabel("Departure").fill(inDays(20));
  const found = page.waitForResponse(
    (r) =>
      /\/search\/scheduled$/.test(r.url()) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Search flights" }).click();
  expect((await found).status()).toBe(200);

  await expect(page).toHaveURL(/\/search\/scheduled\/[0-9a-f-]{36}\?pax=1$/);
  const list = page.getByRole("list", { name: "Flights found" });
  const first = list.getByRole("listitem").first();
  await expect(first).toBeVisible();
  // The fare is a labelled live fare, and says it is for the whole party.
  await expect(first.getByText("Live fare", { exact: true })).toBeVisible();
  await expect(first.getByText("Total for 1 traveller")).toBeVisible();

  const open = () => first.getByRole("button", { name: /^Details:/ }).click();
  const dialog = page.getByRole("dialog");
  await open();
  // Fare rules and the cancellation conditions are shown before any check.
  await expect(
    dialog.getByRole("heading", { name: "Fare rules" }),
  ).toBeVisible();
  await expect(dialog.getByText("Cancellation", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Check price and seats" }).click();
  const confirmed = dialog.getByText("Price and seats confirmed");
  await expect(
    confirmed.or(dialog.getByText("The price has changed")),
  ).toBeVisible();
  if (!(await confirmed.isVisible())) {
    // A changed fare is stored: the second check finds it available.
    await page.keyboard.press("Escape");
    await open();
    await dialog.getByRole("button", { name: "Check price and seats" }).click();
  }
  await expect(confirmed).toBeVisible();
  await expect(
    dialog.getByText(/Booking scheduled flights opens soon/),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Book/ })).toHaveCount(0);
});

test("airlines that do not answer give a partial notice", async ({
  page,
  request,
}, testInfo) => {
  test.slow();
  const [origin, destination] =
    ROUTES[testInfo.project.name as "desktop"].partial;
  const behaviour = (value: "ERROR" | "NORMAL") =>
    request.put(`${API_URL}dev/airline/behaviour`, {
      data: { origin, destination, behaviour: value },
    });
  expect((await behaviour("ERROR")).status()).toBe(204);
  try {
    await page.goto("/search?service=flights");
    await chooseAirport(page, "From", origin);
    await chooseAirport(page, "To", destination);
    await page.getByLabel("Departure").fill(inDays(21));
    await page.getByRole("button", { name: "Search flights" }).click();
    await expect(page).toHaveURL(/\/search\/scheduled\/[0-9a-f-]{36}/);
    await expect(
      page.getByRole("status").filter({ hasText: /did not answer in time/ }),
    ).toBeVisible();
    await expect(page.getByText("No flights found").first()).toBeVisible();
  } finally {
    await behaviour("NORMAL");
  }
});
