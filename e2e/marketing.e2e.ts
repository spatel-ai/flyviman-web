import { expect, test } from "@playwright/test";

/**
 * The customer site's marketing pages, imported from flyviman.com (M4,
 * D-075, D-084): their headings, the navigation between them, and that
 * claims the business has not confirmed stay out.
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
  { path: "/contact", nav: "Contact", heading: "Get in touch" },
] as const;

for (const { path, heading } of PAGES) {
  test(`${path} shows its heading and does not scroll sideways`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    // Scroll-linked motion sets its starting states once the page is idle.
    await expect(page.locator(".site-footer__wordmark")).toHaveCSS(
      "opacity",
      "0.2",
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByText(/24\/7/)).toHaveCount(0);
    await expect(page.getByText(/transparent pricing/i)).toHaveCount(0);
  });
}

test("the header leads to every page and marks the current one", async ({
  page,
}, info) => {
  await page.goto("/");
  const mobile = info.project.name === "mobile";

  for (const { nav, heading } of PAGES) {
    if (mobile) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation", { name: "Site navigation" })
        .getByRole("link", { name: nav })
        .click();
    } else {
      await page
        .getByRole("navigation", { name: "Site" })
        .getByRole("link", { name: nav })
        .click();
    }
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    if (!mobile) {
      await expect(
        page
          .getByRole("navigation", { name: "Site" })
          .getByRole("link", { name: nav }),
      ).toHaveAttribute("aria-current", "page");
    }
  }
});

test("the footer lists the pages", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer" });

  for (const { path, nav } of PAGES) {
    await expect(footer.getByRole("link", { name: nav })).toHaveAttribute(
      "href",
      path,
    );
  }
});

test("the home page leads on to About, Services and Charter", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "View about Flyviman" }),
  ).toHaveAttribute("href", "/about");
  await expect(
    page.getByRole("link", { name: "View more services" }),
  ).toHaveAttribute("href", "/services");
  await expect(
    page.getByRole("link", { name: "View more charter services" }),
  ).toHaveAttribute("href", "/charter");
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

  test("leaves out medical claims and points to emergency services", async ({
    page,
  }) => {
    await page.goto("/services");

    await expect(page.getByText(/medical needs/i)).toHaveCount(0);
    await expect(page.getByText(/air ambulance requirements/i)).toHaveCount(0);
    await expect(page.getByText(/Investor-exclusive access/i)).toHaveCount(0);
    await expect(page.getByText(/In an emergency, call 112/)).toBeVisible();
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
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toBeVisible();
});
