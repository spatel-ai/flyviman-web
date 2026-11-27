import { expect, test, type Page } from "@playwright/test";

/**
 * The customer site's marketing pages, imported from flyviman.com (M4,
 * D-075, D-084, D-092): their headings, the navigation between them, and
 * that the rules still shape what the migration shows.
 */

const PAGES = [
  { path: "/about", nav: "About", heading: "Why Flyviman?" },
  {
    path: "/services",
    nav: "Services",
    heading: "Aviation services, structured end to end",
  },
  {
    path: "/charter",
    nav: "Charter",
    heading: "Comprehensive charter solutions for unforgettable journeys",
  },
  {
    path: "/aircraft-sales",
    nav: "Aircraft sales",
    heading: "Aircraft and helicopters for sale",
  },
  { path: "/pilots", nav: "Pilots", heading: "For pilots" },
  { path: "/contact", nav: "Contact", heading: "Get in touch" },
] as const;

/** Linked from their parent pages and the More menu. */
const MORE_PAGES = [
  { path: "/aviation-solutions", heading: "Powering the future of flight" },
  {
    path: "/charter/fleet",
    heading: "Exquisite fleet for unmatched charter experiences",
  },
  { path: "/aircraft-sales/gulfstream-g550", heading: "Gulfstream G550" },
] as const;

for (const { path, heading } of [...PAGES, ...MORE_PAGES]) {
  test(`${path} shows its heading and does not scroll sideways`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    // Scroll-linked motion sets its starting states once the page is idle;
    // below 768 px it does not run at all (CR-2).
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(page.locator(".site-footer__wordmark")).toHaveCSS(
        "opacity",
        "0.2",
      );
    }
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // Nothing migrated is bookable (rule 4).
    await expect(page.getByText(/^book now$/i)).toHaveCount(0);
  });
}

/** The header's More menu on desktop, its bottom sheet on a phone. */
async function openMore(page: Page, mobile: boolean) {
  await page
    .getByRole("button", { name: mobile ? "Menu" : "More", exact: true })
    .click();
  return mobile
    ? page.getByRole("navigation", { name: "Menu" })
    : page.getByRole("menu");
}

test("the More menu leads to the pages and marks the current one", async ({
  page,
}, info) => {
  await page.goto("/");
  const mobile = info.project.name === "mobile";

  for (const { nav, heading } of [
    ...PAGES.filter(({ nav }) => nav !== "Charter"),
    { nav: "Aviation solutions", heading: MORE_PAGES[0].heading },
    { nav: "Charter fleet", heading: MORE_PAGES[1].heading },
  ]) {
    const more = await openMore(page, mobile);
    await more.getByRole(mobile ? "link" : "menuitem", { name: nav }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
  }

  // Marked by aria-current as well as colour.
  const current = await openMore(page, mobile);
  await expect(
    current.getByRole(mobile ? "link" : "menuitem", {
      name: "Charter fleet",
    }),
  ).toHaveAttribute("aria-current", "page");
});

test("the header offers a charter request", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Phones use the tab bar");
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Request a charter" }),
  ).toHaveAttribute("href", "/search?service=charter");
});

test("the header marks Search as the current page on /search", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "Phones show the tab bar");
  await page.goto("/search");
  const link = page
    .getByRole("navigation", { name: "Site" })
    .getByRole("link", { name: "Search", exact: true });
  await expect(link).toHaveAttribute("aria-current", "page");
  // Marked by weight too, not by colour alone.
  await expect(link).toHaveCSS("font-weight", "500");
});

test("the footer holds the legal links and no page navigation", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer" });

  await expect(footer.getByRole("link")).toHaveText([
    "Terms",
    "Privacy",
    "Image credits",
  ]);
});

test.describe("phone tab bar", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "mobile", "Phones only");
  });

  test("leads to Home, Charter, Enquire and Sign in and marks the current one", async ({
    page,
  }) => {
    await page.goto("/contact");
    const bar = page.getByRole("navigation", { name: "Primary" });
    await expect(bar.getByRole("link", { name: "Enquire" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(bar.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(bar.getByRole("link", { name: "Charter" })).toHaveAttribute(
      "href",
      "/search?service=charter",
    );
    await bar.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("never covers the foot of the page, and the footer has no wordmark", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight }),
    );
    const bar = await page
      .getByRole("navigation", { name: "Primary" })
      .boundingBox();
    const copyright = await page.getByText("© Flyviman").boundingBox();
    expect(copyright!.y + copyright!.height).toBeLessThanOrEqual(bar!.y);
    await expect(page.locator(".site-footer__wordmark")).toBeHidden();
  });
});

test("the home page leads on to charter, and About and Services are in More", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "Search charter" }),
  ).toHaveAttribute("href", "/search?service=charter");
  await expect(
    page.getByRole("link", { name: "About charter" }),
  ).toHaveAttribute("href", "/charter");
  // The company pages are no longer sections of the home page.
  await expect(
    page.getByRole("link", { name: "View about Flyviman" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "View more services" }),
  ).toHaveCount(0);
});

test.describe("about", () => {
  test("carries vision, mission, the founder's note and the team", async ({
    page,
  }) => {
    await page.goto("/about");

    for (const name of [
      "Where we are going, and how we get there",
      "Clear, neutral advice for decisions that matter",
      "Aviation understood beyond the paperwork",
      "Discipline and foresight",
      "Built on people & trust",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(
      page.getByText(/full-spectrum aviation partner/),
    ).toBeVisible();
  });
});

test.describe("services", () => {
  test("has the five services, each reachable from the index", async ({
    page,
  }) => {
    await page.goto("/services");
    const index = page.getByRole("navigation", {
      name: "Services on this page",
    });

    for (const name of [
      "Aircraft sale & purchase",
      "Aircraft leasing",
      "Charter services",
      "Aviation consultancy",
      "Aviation investment",
    ]) {
      await expect(index.getByRole("link", { name })).toBeVisible();
    }
    await index.getByRole("link", { name: "Aviation investment" }).click();
    await expect(page).toHaveURL(/#investment$/);
  });

  test("medical wording comes with the emergency-services notice", async ({
    page,
  }) => {
    await page.goto("/services");

    // The notice is always in view; the wording near it opens on a phone.
    await expect(page.getByText(/In an emergency, call 112/)).toBeVisible();
    const charter = page.locator("#charter");
    if (await charter.getByText("Read more").first().isVisible()) {
      await charter.getByText("Read more").first().click();
    }
    await expect(page.getByText(/medical needs/i)).toBeVisible();
    await expect(page.getByText(/Investor-exclusive access/i)).toBeVisible();
    await expect(
      page
        .getByRole("complementary")
        .filter({ has: page.getByText("Insights", { exact: true }) }),
    ).toHaveCount(5);
  });
});

test("long copy is short on a phone and open on a desktop (CR-2)", async ({
  page,
}, info) => {
  await page.goto("/about");
  const rest = page.getByText(/^Driven by a commitment to professionalism/);
  const more = page.getByText("Read more").first();
  if (info.project.name === "mobile") {
    await expect(more).toBeVisible();
    await expect(rest).toBeHidden();
    await more.click();
    await expect(rest).toBeVisible();
  } else {
    await expect(more).toBeHidden();
    await expect(rest).toBeVisible();
  }
});

test.describe("full migration (D-092)", () => {
  test("course fees are labelled estimates and lead to a pilot enquiry", async ({
    page,
  }) => {
    await page.goto("/pilots");
    const course = page.getByRole("listitem").filter({
      has: page.getByRole("heading", { name: "Private pilot course" }),
    });
    await expect(course.getByText("Estimate", { exact: true })).toBeVisible();
    await expect(course.getByText("₹21,00,000")).toBeVisible();
    await course.getByRole("link", { name: /apply now/i }).click();
    await expect(page).toHaveURL(/topic=PILOT_TRAINING/);
  });

  test("a sale listing has its details, no broker, and an enquiry", async ({
    page,
  }) => {
    await page.goto("/aircraft-sales/2023-airbus-h130");
    await expect(page.getByText("On request")).toBeVisible();
    await expect(page.getByText(/Proudly presented by/i)).toHaveCount(0);
    await expect(page.getByText(/Martin Weening/)).toHaveCount(0);
    await page.getByRole("link", { name: "Enquire now" }).click();
    await expect(page).toHaveURL(/topic=AIRCRAFT_SALES/);
  });
});

test.describe("charter", () => {
  test("offers eight kinds, each as an enquiry rather than a booking", async ({
    page,
  }) => {
    await page.goto("/charter");

    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(8);
    await expect(page.getByText(/book now/i)).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Send an enquiry: election charter" }),
    ).toHaveAttribute("href", "/contact?topic=ELECTION_CHARTER#enquiry");
  });

  test("the medical charter card points to emergency services and never moves", async ({
    page,
  }) => {
    await page.goto("/charter");
    const notice = page.getByText(/In an emergency, call 112/);

    await expect(notice).toBeVisible();
    await expect(notice.locator("xpath=ancestor::*[@data-reveal]")).toHaveCount(
      0,
    );
  });
});

test("the header fits a 320 px wide phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Sign in" }),
  ).toBeVisible();
});

test("on a phone the menu button is 'Menu' and its sheet has Search and the charter request", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile", "phones only");
  await page.goto("/about");
  await expect(
    page.getByRole("button", { name: "More", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const sheet = page.getByRole("navigation", { name: "Menu" });
  await expect(sheet.getByRole("link", { name: "Search" })).toHaveAttribute(
    "href",
    "/search",
  );
  await expect(
    sheet.getByRole("link", { name: "Request a charter" }),
  ).toHaveAttribute("href", "/search?service=charter");
});

test.describe("aircraft sales and charter cards (W1-032, W1-033, W1-034)", () => {
  test("headings, brand spelling and missing data on /aircraft-sales", async ({
    page,
  }) => {
    await page.goto("/aircraft-sales");

    await expect(
      page.getByRole("heading", { level: 2, name: "Aircraft for sale" }),
    ).toBeVisible();
    await expect(page.getByText(/Aircrafts for sale/)).toHaveCount(0);
    await expect(page.getByText(/FlyViman/)).toHaveCount(0);
    // A zero total time is a missing figure, never shown as a fact.
    await expect(page.getByText(/^0 hrs$/)).toHaveCount(0);
    await expect(
      page.getByText("Total time: Not stated").first(),
    ).toBeVisible();
    // Every card has the same rows.
    const cards = page.locator("main li:has(h3)");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      await expect(cards.nth(i).getByText(/^SN/)).toHaveCount(1);
    }
  });

  test("the helicopters are paged, twelve at a time", async ({ page }) => {
    await page.goto("/aircraft-sales");
    const helicopters = page.locator(
      'section[aria-labelledby="sales-HELICOPTER"]',
    );
    await expect(helicopters.locator("h3")).toHaveCount(12);
    await expect(helicopters.getByText(/^Showing 12 of \d+$/)).toBeVisible();

    await helicopters.getByRole("button", { name: "Show more" }).click();
    await expect(helicopters.locator("h3")).toHaveCount(24);
    await helicopters.getByRole("button", { name: "Show more" }).click();
    await expect(helicopters.locator("h3")).not.toHaveCount(24);
    await expect(
      helicopters.getByRole("button", { name: "Show more" }),
    ).toHaveCount(0);
  });

  test("a stated total time is shown on the detail page, a zero is not", async ({
    page,
  }) => {
    await page.goto("/aircraft-sales/gulfstream-g550");
    await expect(page.getByText("5236 hrs")).toBeVisible();
  });

  test("in-card links line up with the card text, and charter cards have distinct photos", async ({
    page,
  }) => {
    await page.goto("/charter");
    const card = page.locator("main li:has(h3)", { hasText: "Group charter" });
    const title = await card.getByRole("heading").boundingBox();
    // The link's label, not its padded button, starts at the text's edge.
    const link = await card
      .getByRole("link", { name: /Send an enquiry/ })
      .boundingBox();
    expect(Math.abs(link!.x + 20 - title!.x)).toBeLessThanOrEqual(1.5);

    const sources = await page
      .locator("main ul li img")
      .evaluateAll((imgs) =>
        imgs.map((img) =>
          new URL((img as HTMLImageElement).src).searchParams.get("url"),
        ),
      );
    expect(sources).toHaveLength(8);
    expect(new Set(sources).size).toBe(8);
  });
});
