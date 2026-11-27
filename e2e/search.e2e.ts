import { expect, test } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll } from "./support/api";
import { expectBarAboveTabBar, expectPageEndClear } from "./support/phone";
import { approvedAircraft, asStaff, csrf } from "./support/operators";

/** Charter search (M5, slice 1): search, results, detail, enquiry. */

function inDays(days: number, hourUtc = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}

/** YYYY-MM-DD in India, for the date field. */
function indiaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    date,
  );
}

test("a visitor searches, opens a result and requests the aircraft as an enquiry", async ({
  page,
  browser,
}) => {
  test.slow();
  // An approved light jet in Mumbai with time offered around the trip.
  const operator = await browser.newPage();
  const { id } = await approvedAircraft(operator, browser);
  const slot = await operator.request.post(
    `${API_URL}operator/aircraft/${id}/availability/slots`,
    {
      headers: await csrf(operator),
      data: {
        startsAt: inDays(3).toISOString(),
        endsAt: inDays(6).toISOString(),
        kind: "OPEN",
      },
    },
  );
  expect(slot.status()).toBe(201);
  await operator.close();

  const isMobile = test.info().project.name === "mobile";
  await page.goto("/search");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Fly private, on your schedule",
    }),
  ).toBeVisible();

  // From: a popular airport, chosen without typing.
  // A click before the page has hydrated does nothing: click again until
  // the airport list has opened.
  const bom = page.getByRole("option", { name: /BOM/ });
  await expect(async () => {
    if (!(await bom.isVisible())) {
      await page.getByRole("button", { name: /^From:/ }).click();
    }
    await expect(bom).toBeVisible({ timeout: 1000 });
  }).toPass();
  await bom.click();
  await expect(
    page.getByRole("button", { name: /^From: Mumbai/ }),
  ).toBeVisible();
  // To: typed.
  await page.getByRole("button", { name: /^To:/ }).click();
  await page.getByRole("combobox", { name: "Search to airports" }).fill("GOI");
  await page.getByRole("option", { name: /GOI/ }).click();

  // Departure: the fare calendar, then a time.
  const departure = inDays(4, 6);
  const day = indiaDate(departure);
  await page.getByRole("button", { name: /^Departure:/ }).click();
  await expect(page.getByText(/Lowest estimates per day/)).toBeVisible();
  const monthName = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
  if (!(await page.getByRole("grid", { name: monthName }).isVisible())) {
    await page.getByRole("button", { name: "Next month" }).click();
  }
  const dayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
  await page
    .getByRole("grid", { name: monthName })
    .getByRole("button", { name: new RegExp(`^${dayLabel}`) })
    .click();
  await page.getByRole("button", { name: "11:00", exact: true }).click();
  await page.getByRole("button", { name: "Done" }).click();

  // Travellers: 2 by default, two more.
  await page.getByRole("button", { name: /^Travellers:/ }).click();
  await page.getByRole("button", { name: "One more passenger" }).click();
  await page.getByRole("button", { name: "One more passenger" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByRole("button", { name: "Travellers: 4 passengers" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expectNoSidewaysScroll(page);
  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}$/);
  const results = page.getByRole("list", { name: "Aircraft found" });
  await expect(results.getByRole("listitem").first()).toBeVisible();
  await expect(page.getByRole("group", { name: "Nearby dates" })).toBeVisible();

  // Sorting and filters are kept in the address.
  await page.getByRole("radio", { name: "Fastest" }).click();
  await expect(page).toHaveURL(/sort=fastest/);
  if (isMobile) await page.getByRole("button", { name: "Filters" }).click();
  await page
    .getByRole("checkbox", { name: /^Light jet/ })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/class=LIGHT_JET/);
  if (isMobile) await page.getByRole("button", { name: "Close" }).click();
  await expect(results.getByRole("listitem").first()).toBeVisible();
  // Nothing found here is bookable (business rule 4).
  await expect(page.getByText(/book now/i)).toHaveCount(0);

  await results
    .getByRole("link", { name: /^Details:/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Either a labelled estimate or "Price on request", never a bare price.
  // The results page stays in the document, hidden: count visible text only.
  await expect(
    page
      .getByText("Estimate", { exact: true })
      .or(page.getByText("Price on request"))
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByText(/cancellation terms/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  if (isMobile) {
    // The sticky bar carries the action, the label and the note (rules 1, 9).
    const bar = page.getByRole("region", { name: "Request this flight" });
    await expectBarAboveTabBar(page, bar);
    await expect(
      bar
        .getByText("Estimate", { exact: true })
        .or(bar.getByText("Price on request")),
    ).toBeVisible();
    await expect(bar.getByText(/cancellation terms/i)).toBeVisible();
    await expectPageEndClear(page);
  }

  await page.getByRole("link", { name: "Send an enquiry instead" }).click();
  await expect(page).toHaveURL(/\/contact\?topic=PRIVATE_CHARTER/);
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(
    /I would like to request the .+ Search reference/,
  );
});

test("the search form explains what is missing", async ({ page }) => {
  await page.goto("/search");
  // No time is suggested before a date is chosen.
  await expect(page.getByRole("button", { name: /^Departure:/ })).toContainText(
    "Pick a date, then a time",
  );
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Choose where you fly from.")).toBeVisible();
  await expect(page.getByText("Choose where you fly to.")).toBeVisible();
});

test("a round trip asks for a return and keeps it from the address", async ({
  page,
}) => {
  await page.goto("/search?tripType=ROUND_TRIP");
  await expect(page.getByRole("radio", { name: "Round trip" })).toBeChecked();
  await expect(page.getByRole("button", { name: /^Return:/ })).toBeVisible();
  await page.getByRole("radio", { name: "One way" }).click();
  await expect(page.getByRole("button", { name: /^Return:/ })).toHaveCount(0);
  await page.getByRole("radio", { name: "Round trip" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Choose a return date.")).toBeVisible();
});

test("round-trip results and detail show the strategy and the extra lines", async ({
  page,
  browser,
}) => {
  test.slow();
  // A priced light jet in Mumbai, offered from day 3 to day 6, whose
  // overnight stay costs less than flying home and back.
  const operator = await browser.newPage();
  const { id } = await approvedAircraft(operator, browser);
  const headers = await csrf(operator);
  const slot = await operator.request.post(
    `${API_URL}operator/aircraft/${id}/availability/slots`,
    {
      headers,
      data: {
        startsAt: inDays(3).toISOString(),
        endsAt: inDays(6).toISOString(),
        kind: "OPEN",
      },
    },
  );
  expect(slot.status()).toBe(201);
  const rate = await operator.request.put(
    `${API_URL}operator/aircraft/${id}/pricing`,
    {
      headers,
      data: {
        hourlyRateMinor: 18_000_000,
        taxInclusive: false,
        commissionInclusive: false,
        minBillableHours: null,
      },
    },
  );
  expect(rate.status()).toBe(200);
  const defaults = await operator.request.put(`${API_URL}operator/pricing`, {
    headers,
    data: {
      minBillableHours: null,
      positioningRateFactor: 0.8,
      freeWithinKm: 0,
      landingFallbackMinor: null,
      handlingFallbackMinor: null,
      overnightMinor: 1_000_000,
      crewNightMinor: 1_000_000,
    },
  });
  expect(defaults.status()).toBe(200);
  const locationId = async (q: string) =>
    (
      await (
        await operator.request.get(`${API_URL}locations`, {
          params: { q, pageSize: 1 },
        })
      ).json()
    ).data[0].id as string;
  const response = await operator.request.post(`${API_URL}search/charter`, {
    headers,
    data: {
      originId: await locationId("BOM"),
      destinationId: await locationId("GOI"),
      departureAt: inDays(4, 6).toISOString(),
      passengerCount: 2,
      tripType: "ROUND_TRIP",
      returnAt: inDays(5, 6).toISOString(),
    },
  });
  expect(response.status()).toBe(200);
  const search = (await response.json()).data;
  const result = search.results.find(
    (entry: { aircraft: { id: string } }) => entry.aircraft.id === id,
  );
  expect(result.roundTripStrategy).toBe("WAIT");
  await operator.close();

  await page.goto(`/search/${search.searchId}`);
  await expect(page.getByText(/ · returns /)).toBeVisible();
  // The strip's figures are one-way, and say so.
  await expect(page.getByText(/^One way from /).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page
      .getByRole("list", { name: "Aircraft found" })
      .getByText("Round trip · Aircraft waits at destination")
      .first(),
  ).toBeVisible();

  await page.goto(`/search/${search.searchId}/${result.resultId}`);
  const main = page.getByRole("main");
  await expect(main.getByText(/^Round trip, returning /)).toBeVisible();
  await expect(main.getByText(/Aircraft waits at destination/)).toBeVisible();
  for (const line of [/^Flying$/, /^Overnight at /, /^Crew allowance, /]) {
    await expect(main.getByText(line).first()).toBeVisible();
  }
  // Flyviman's cancellation tiers, before the request button (rule 9).
  await expect(
    main.getByRole("region", { name: "Cancellation terms" }),
  ).toContainText("before departure, or a no-show");
});

test("the open travellers picker leaves the Search button usable", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "desktop",
    "Phones use a bottom sheet, which is meant to cover the page",
  );
  // A wide laptop, where the panel used to open over the button.
  await page.setViewportSize({ width: 1710, height: 1100 });
  await page.goto("/search");
  await page.getByRole("button", { name: /^Travellers:/ }).click();
  const panel = page.getByRole("dialog", { name: "Travellers" });
  await expect(panel).toBeVisible();
  const search = page.getByRole("button", { name: "Search", exact: true });
  const a = await panel.boundingBox();
  const b = await search.boundingBox();
  if (!a || !b) throw new Error("panel or Search button not laid out");
  const overlaps =
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height;
  expect(overlaps, "the travellers panel covers the Search button").toBe(false);
});

test("the airport picker works from the keyboard", async ({ page }) => {
  test.skip(
    test.info().project.name !== "desktop",
    "Keyboard use is checked on desktop",
  );
  await page.goto("/search");
  const from = page.getByRole("button", { name: /^From:/ });
  const box = page.getByRole("combobox", { name: "Search from airports" });
  // A key pressed before the page has hydrated does nothing: press again
  // until the picker has opened.
  await expect(async () => {
    await from.focus();
    await page.keyboard.press("Enter");
    await expect(box).toBeFocused({ timeout: 1000 });
  }).toPass();
  // Popular airports are listed before anything is typed (F1).
  await expect(
    page.getByRole("listbox", { name: "Popular airports" }),
  ).toContainText("Mumbai");
  await box.fill("GOI");
  // The popular list (which also holds Goa) stays until the live results
  // replace it; Enter before then would choose the popular list's first row.
  const results = page.getByRole("listbox", { name: "Results" });
  await expect(results.getByRole("option", { name: /GOI/ })).toBeVisible();
  await expect(results.getByRole("option").first()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^From:/ })).toContainText(
    "GOI",
  );
  // Escape closes without choosing.
  // The From picker gives focus back to its tile as it closes; press again
  // until the To picker has opened.
  const toBox = page.getByRole("combobox", { name: "Search to airports" });
  await expect(async () => {
    await page.getByRole("button", { name: /^To:/ }).focus();
    await page.keyboard.press("Enter");
    await expect(toBox).toBeFocused({ timeout: 1000 });
  }).toPass();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("combobox", { name: "Search to airports" }),
  ).toBeHidden();
  await expect(page.getByRole("button", { name: /^To:/ })).toContainText(
    "Choose airport",
  );
});

test("the Empty legs tab leads to the empty-leg offers", async ({ page }) => {
  await page.goto("/search");
  const emptyLegs = page.getByRole("tab", { name: "Empty legs", exact: true });
  await expect(emptyLegs).toBeVisible();
  await expect(page.getByText("Coming soon")).toHaveCount(0);
  await emptyLegs.click();
  await expect(
    page.getByRole("link", { name: "See empty legs" }),
  ).toHaveAttribute("href", "/empty-legs");
});

test("choosing the Scheduled tab changes the page headline", async ({
  page,
}) => {
  await page.goto("/search");
  await expect(page.locator("#search-hero")).not.toHaveText(
    "Compare airline flights",
  );
  await page.getByRole("tab", { name: /Scheduled/ }).click();
  await expect(page.locator("#search-hero")).toHaveText(
    "Compare airline flights",
  );
});

test("air ambulance is a request, never a search, with the emergency notice", async ({
  page,
}) => {
  await page.goto("/search?service=air-ambulance");
  // A streamed page can briefly hold a hidden copy: count visible text only.
  await expect(
    page.getByText(/In an emergency, call 112/).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Request an air ambulance" }),
  ).toHaveAttribute("href", "/air-ambulance");
});

test("a charter search shows empty legs on the route, each with a labelled price and a link to its page", async ({
  page,
  browser,
}) => {
  test.slow();
  // An approved jet with a published, approved offer Goa to Mumbai.
  const operator = await browser.newPage();
  const { id: aircraftId } = await approvedAircraft(operator, browser);
  const location = async (code: string) =>
    (
      await (
        await operator.request.get(`${API_URL}locations`, {
          params: { q: code, pageSize: 1 },
        })
      ).json()
    ).data[0].id as string;
  const [goa, mumbai] = [await location("GOI"), await location("BOM")];
  const at = (days: number, hour: number) => inDays(days, hour).toISOString();
  const created = await operator.request.post(`${API_URL}operator/empty-legs`, {
    headers: await csrf(operator),
    data: {
      aircraftId,
      originId: goa,
      destinationId: mumbai,
      // A window of its own on day 10, more than the search window from the
      // day 6 and 7 offers other tests leave, so they never crowd it out.
      departureFrom: at(10, 12),
      departureTo: at(10, 14),
      seatsAvailable: 6,
      priceMinor: 18_500_000,
      validUntil: at(5, 12),
      conditions: "Subject to the aircraft repositioning as planned.",
    },
  });
  expect(created.status()).toBe(201);
  const offer = (await created.json()).data as { id: string };
  const published = await operator.request.post(
    `${API_URL}operator/empty-legs/${offer.id}/publish`,
    { headers: await csrf(operator) },
  );
  expect(published.status()).toBe(200);
  const staff = await asStaff(browser);
  const approved = await staff.page.request.post(
    `${API_URL}admin/empty-legs/${offer.id}/approve`,
    { headers: await csrf(staff.page) },
  );
  expect(approved.status()).toBe(200);
  await staff.context.close();
  await operator.close();

  const searched = await page.request.post(`${API_URL}search/charter`, {
    data: {
      originId: goa,
      destinationId: mumbai,
      departureAt: at(10, 13),
      passengerCount: 3,
    },
  });
  expect(searched.status()).toBe(200);
  const { searchId } = (await searched.json()).data as { searchId: string };

  await page.goto(`/search/${searchId}`);
  const strip = page.getByRole("region", { name: "Empty legs on this route" });
  await expect(strip).toBeVisible();
  await expectNoSidewaysScroll(page);
  // The offer's own price, labelled (rule 1), never a bare amount.
  await expect(
    strip.getByText(/Quote|Estimate|Confirmed|Live fare/i).first(),
  ).toBeVisible();
  await strip.locator(`a[href="/empty-legs/${offer.id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/empty-legs/${offer.id}$`));
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

for (const scheme of ["light", "dark"] as const) {
  test(`on a phone the hero text stays clear of the search card, ${scheme} (W1-031)`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/search");
    const lead = page.locator(".search-hero-extra").last();
    await expect(lead).toBeVisible();
    const leadBox = await lead.boundingBox();
    const cardBox = await page.locator(".search-hero-card").boundingBox();
    expect((leadBox?.y ?? 0) + (leadBox?.height ?? 0)).toBeLessThanOrEqual(
      cardBox?.y ?? 0,
    );
  });
}
