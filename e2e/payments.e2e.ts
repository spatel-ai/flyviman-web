import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  acceptRequest,
  listedJet,
  newCustomer,
  requestThroughApi,
  searchFor,
} from "./support/bookings";

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
