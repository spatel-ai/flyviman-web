import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  acceptRequest,
  listedJet,
  newCustomer,
  requestThroughApi,
  searchFor,
} from "./support/bookings";
import { asStaff } from "./support/operators";

/**
 * Paying for a trip on the mock gateway (M9, W4-3). The test checkout
 * stands in for the gateway; the gateway's notice is posted by it as the
 * gateway's servers would, and the test holds that notice to prove the
 * page waits for it: a checkout success alone never marks a payment paid.
 */

declare global {
  interface Window {
    __cspViolations: string[];
  }
}

/** A trip awaiting payment: priced request, accepted by the operator. */
async function tripAwaitingPayment(browser: Browser) {
  const { operator, aircraftId } = await listedJet(browser, true);
  const { page, passengerId } = await newCustomer(browser);
  const searched = await searchFor(page, aircraftId);
  const reference = await requestThroughApi(page, searched, passengerId);
  await acceptRequest(operator, reference);
  await operator.close();
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations.push(
        `${event.violatedDirective} blocked ${event.blockedURI || "inline"}`,
      );
    });
  });
  return { page, reference };
}

/** Holds the gateway's notices until `release` is called. */
async function holdNotices(page: Page) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let held = 0;
  await page.route("**/webhooks/payments/mock", async (route) => {
    held += 1;
    await released;
    await route.continue();
  });
  return { release, held: () => held };
}

/** Opens the payment page from the trip page, with a full page load. */
async function openPayment(page: Page, reference: string) {
  const main = page.getByRole("main");
  await page.goto(`/account/trips/${reference}`);
  await expect(main.getByLabel("Payment due")).toBeVisible();
  await main.getByRole("link", { name: /^Pay/ }).click();
  await expect(page).toHaveURL(new RegExp(`/account/trips/${reference}/pay$`));
  await expect(
    main.getByRole("heading", { level: 1, name: "Pay for your trip" }),
  ).toBeVisible();
  return main;
}

/** The two status badges, which are never combined. */
const badges = (page: Page) => {
  const main = page.getByRole("main");
  const badge = (caption: RegExp) =>
    main.locator("span", { hasText: caption }).locator("[data-status]");
  return { booking: badge(/^Booking\s/), payment: badge(/^Payment\s/) };
};

test("a customer pays with the test checkout; paid and confirmed appear only after the gateway's notice", async ({
  browser,
}) => {
  test.slow();
  const { page, reference } = await tripAwaitingPayment(browser);
  const notices = await holdNotices(page);
  const main = await openPayment(page, reference);

  // The amount due, labelled, and the conditions before the button.
  const due = main.getByLabel("Amount due now");
  await expect(due.getByText("Confirmed price")).toBeVisible();
  await expect(main.getByText(/cancell/i).first()).toBeVisible();
  await main.getByRole("button", { name: /^Pay (now|deposit)$/ }).click();

  const checkout = page.getByRole("dialog", { name: "Test checkout" });
  await expect(
    checkout.getByText("No money moves.", { exact: false }),
  ).toBeVisible();
  await checkout.getByRole("button", { name: "Pay (test)" }).click();

  // Checkout succeeded and was verified, but the notice is held: still unpaid.
  await expect(
    main.getByRole("heading", { name: "Waiting for the payment provider" }),
  ).toBeVisible();
  await expect.poll(notices.held).toBe(1);
  const { booking, payment } = badges(page);
  await expect(payment).toHaveText("Unpaid");
  await expect(booking).toHaveText("Awaiting payment");

  notices.release();
  await expect(
    main.getByRole("heading", { name: "Payment received" }),
  ).toBeVisible();
  await expect(payment).toHaveText(/^(Paid|Partially paid)$/);
  await expect(booking).toHaveText("Confirmed");
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);

  // The trip page shows both statuses, and nothing is due any more.
  await main.getByRole("link", { name: "Back to your trip" }).click();
  await expect(page).toHaveURL(new RegExp(`/account/trips/${reference}$`));
  await expect(badges(page).booking).toHaveText("Confirmed");
  await expect(main.getByLabel("Payment due")).toHaveCount(0);
  await page.close();
});

test("a failed payment changes nothing and can be tried again", async ({
  browser,
}) => {
  test.slow();
  const { page, reference } = await tripAwaitingPayment(browser);
  const main = await openPayment(page, reference);

  await main.getByRole("button", { name: /^Pay (now|deposit)$/ }).click();
  const checkout = page.getByRole("dialog", { name: "Test checkout" });
  await checkout.getByRole("button", { name: "Fail (test)" }).click();
  await expect(main.getByRole("alert")).toContainText(
    "The payment did not go through",
  );
  const { booking, payment } = badges(page);
  await expect(payment).toHaveText("Unpaid");
  await expect(booking).toHaveText("Awaiting payment");

  await main.getByRole("button", { name: "Try again" }).click();
  await main.getByRole("button", { name: /^Pay (now|deposit)$/ }).click();
  await page
    .getByRole("dialog", { name: "Test checkout" })
    .getByRole("button", { name: "Pay (test)" })
    .click();
  await expect(
    main.getByRole("heading", { name: "Payment received" }),
  ).toBeVisible();
  await expect(booking).toHaveText("Confirmed");
  await page.close();
});

test("only the payment page allows Razorpay, and the browser's payment API", async ({
  request,
}) => {
  const headers = async (path: string) =>
    (await request.get(path, { maxRedirects: 0 })).headers();

  // Signed out, both redirect to sign-in, carrying their own headers.
  const pay = await headers("/account/trips/FLY-BK-1/pay");
  const csp = new Map(
    pay["content-security-policy"].split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources] as const;
    }),
  );
  expect(csp.get("script-src")).toContain("https://checkout.razorpay.com");
  expect(csp.get("script-src")).not.toContain("'unsafe-eval'");
  expect(csp.get("frame-src")).toEqual([
    "https://checkout.razorpay.com",
    "https://api.razorpay.com",
  ]);
  expect(csp.get("connect-src")).toEqual(
    expect.arrayContaining([
      "https://api.razorpay.com",
      "https://lumberjack.razorpay.com",
    ]),
  );
  expect(csp.get("img-src")).toContain("https://cdn.razorpay.com");
  expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
  expect(pay["permissions-policy"]).toContain(
    'payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
  );

  const trip = await headers("/account/trips/FLY-BK-1");
  expect(trip["content-security-policy"]).not.toContain("razorpay");
  expect(trip["permissions-policy"]).toContain("payment=()");
});

test("finance refunds a paid trip the customer cancelled, from Due to History", async ({
  browser,
}) => {
  test.slow();
  const { page, reference } = await tripAwaitingPayment(browser);
  const main = await openPayment(page, reference);
  await main.getByRole("button", { name: /^Pay (now|deposit)$/ }).click();
  await page
    .getByRole("dialog", { name: "Test checkout" })
    .getByRole("button", { name: "Pay (test)" })
    .click();
  await expect(
    main.getByRole("heading", { name: "Payment received" }),
  ).toBeVisible();

  // The trip lists the payment with its receipt, which is not a tax invoice.
  await main.getByRole("link", { name: "Back to your trip" }).click();
  const receiptLink = main.getByRole("link", { name: /^Receipt for / });
  await expect(receiptLink).toBeVisible();
  await receiptLink.click();
  await expect(
    main.getByRole("heading", { level: 1, name: "Payment receipt" }),
  ).toBeVisible();
  await expect(main.getByText(/not a GST tax invoice/)).toBeVisible();
  // Issued is when the payment was confirmed, not when it is viewed (W1-026).
  const issued = main.locator("dt", { hasText: /^Issued$/ }).locator("+ dd");
  const paid = main.locator("dt", { hasText: /^Paid$/ }).locator("+ dd");
  await expect(issued).not.toHaveText("—");
  await expect(issued).toHaveText((await paid.textContent()) ?? "");
  await expect(
    main.locator("header").getByRole("button", { name: "Print" }),
  ).toBeVisible();
  await main.getByRole("link", { name: `Back to trip ${reference}` }).click();

  // The customer cancels after seeing the conditions.
  await page.getByRole("button", { name: "Cancel this trip" }).click();
  const cancel = page.getByRole("dialog");
  await expect(
    cancel.getByRole("heading", { name: "Cancellation conditions" }),
  ).toBeVisible();
  await cancel.getByRole("button", { name: "Cancel this trip" }).click();
  await expect(badges(page).booking).toHaveText("Cancelled");
  await page.close();

  // Finance sees it under Due and refunds it with a reason.
  const finance = await asStaff(browser, "finance");
  const admin = finance.page.getByRole("main");
  await finance.page.goto("/admin/refunds");
  // Due is oldest first and paged, so on a shared database this refund can
  // sit on a later page. The pager shows once a page has loaded; walk forward
  // until the refund's button is on it.
  const pager = admin.getByRole("navigation", { name: "Pagination" });
  const refundButton = admin.getByRole("button", {
    name: `Refund ${reference}`,
  });
  await expect(pager).toBeVisible();
  while (!(await refundButton.isVisible())) {
    const next = pager.getByRole("button", { name: "Next" });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(pager).toBeVisible();
  }
  await refundButton.click();
  const dialog = finance.page.getByRole("dialog", {
    name: `Refund ${reference}`,
  });
  await expect(dialog.getByLabel(/Amount to refund/)).not.toHaveValue("");
  await dialog.getByRole("button", { name: "Refund" }).click();
  await expect(dialog.getByText(/Give a reason/)).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Reason" })
    .fill("Customer cancelled within the conditions");
  await dialog.getByRole("button", { name: "Refund" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    admin.getByRole("button", { name: `Refund ${reference}` }),
  ).toHaveCount(0);

  await admin.getByRole("tab", { name: "History" }).click();
  const row = admin.getByRole("row", { name: new RegExp(reference) });
  await expect(row).toBeVisible();
  await expect(
    row.getByText("Customer cancelled within the conditions"),
  ).toBeVisible();
  await finance.context.close();
});

test("the payment page says what is paid for and by when, and Pay now clears the tab bar on a phone", async ({
  browser,
}) => {
  test.slow();
  const { page, reference } = await tripAwaitingPayment(browser);
  const main = page.getByRole("main");
  // Both pages load cold: no page error (a hydration mismatch, D-254) and
  // no console error.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  // The trip page's card carries the deadline too.
  await page.goto(`/account/trips/${reference}`);
  await expect(
    main.getByLabel("Payment due").getByText(/^Pay by .* IST$/),
  ).toBeVisible();

  await page.goto(`/account/trips/${reference}/pay`);
  const summary = main.getByLabel("Trip summary");
  await expect(summary.getByText(/ to /).first()).toBeVisible();
  await expect(summary.getByText(/ IST/).first()).toBeVisible();
  await expect(summary.getByText("Passengers")).toBeVisible();
  await expect(summary.getByText(reference)).toBeVisible();
  const due = main.getByLabel("Amount due now");
  await expect(due.getByText(/^Pay by .* IST$/)).toBeVisible();
  await expect(due.getByText(/(day|hour|minute)s? .*left|left$/)).toBeVisible();
  await expect(
    main.getByText(/check the price and availability again/),
  ).toBeVisible();
  await expect(due.getByRole("status")).toHaveCount(0);
  // Settled: anything the pages throw after their data arrives counts.
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);

  // A real 390 x 844 viewport: scrolled to the end, the button is clear of
  // the fixed tab bar.
  await page.setViewportSize({ width: 390, height: 844 });
  const pay = main.getByRole("button", { name: /^Pay (now|deposit)$/ });
  await pay.scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const bar = await page
    .getByRole("navigation", { name: "Primary" })
    .boundingBox();
  const button = await pay.boundingBox();
  expect(bar).not.toBeNull();
  expect(button).not.toBeNull();
  expect(button!.y + button!.height).toBeLessThanOrEqual(bar!.y);
  await page.close();
});
