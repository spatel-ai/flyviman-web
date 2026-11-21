import { expect, test, type Browser, type Page } from "@playwright/test";
import { API_URL, signIn } from "./support/api";
import { approvedAircraft, asStaff, csrf } from "./support/operators";

/**
 * Empty legs (M7 web). The API server runs with review required
 * (playwright.config.ts), so an operator's publish waits for operations.
 */

const CONDITIONS = "Subject to the aircraft repositioning as planned.";

/** A calendar day and time `days` from now, in India's time. */
function inIndia(days: number, hour: number) {
  const day = new Date(Date.now() + days * 86_400_000 + 5.5 * 3_600_000);
  return {
    day: day.toISOString().slice(0, 10),
    time: `${String(hour).padStart(2, "0")}:00`,
  };
}

async function locationId(page: Page, code: string) {
  const response = await page.request.get(`${API_URL}locations`, {
    params: { q: code, pageSize: 1 },
  });
  return (await response.json()).data[0].id as string;
}

/** A draft offer made through the API, for the operator signed in on `page`. */
async function draftOffer(page: Page, aircraftId: string) {
  const [origin, destination] = await Promise.all([
    locationId(page, "GOI"),
    locationId(page, "BOM"),
  ]);
  const day = (days: number, hour: number) =>
    new Date(Date.now() + days * 86_400_000 + hour * 3_600_000).toISOString();
  const created = await page.request.post(`${API_URL}operator/empty-legs`, {
    headers: await csrf(page),
    data: {
      aircraftId,
      originId: origin,
      destinationId: destination,
      departureFrom: day(6, 4),
      departureTo: day(6, 12),
      seatsAvailable: 6,
      priceMinor: 18_500_000,
      validUntil: day(5, 12),
      conditions: CONDITIONS,
    },
  });
  expect(created.status()).toBe(201);
  return (await created.json()).data as { id: string; reference: string };
}

async function publishViaApi(page: Page, id: string) {
  const response = await page.request.post(
    `${API_URL}operator/empty-legs/${id}/publish`,
    { headers: await csrf(page) },
  );
  expect(response.status()).toBe(200);
}

async function approveViaApi(browser: Browser, id: string) {
  const staff = await asStaff(browser);
  const response = await staff.page.request.post(
    `${API_URL}admin/empty-legs/${id}/approve`,
    { headers: await csrf(staff.page) },
  );
  expect(response.status()).toBe(200);
  await staff.context.close();
}

test("the customer page names itself and offers the filters", async ({
  page,
}) => {
  await page.goto("/empty-legs");
  await expect(
    page.getByRole("heading", { level: 1, name: "Empty legs" }),
  ).toBeVisible();
  const filters = page.getByRole("form", { name: "Filter empty legs" });
  await expect(filters.getByLabel("Earliest day")).toBeVisible();
  await expect(filters.getByLabel("Passengers")).toBeVisible();
  await expect(
    filters.getByRole("button", { name: "Show offers" }),
  ).toBeVisible();
});

test("the filters are kept in the address and can match nothing", async ({
  page,
}) => {
  await page.goto("/empty-legs");
  await page.getByLabel("Passengers").fill("3");
  await page.getByLabel("Highest price (INR)").fill("1");
  await page.getByRole("button", { name: "Show offers" }).click();
  await expect(page).toHaveURL(/passengers=3/);
  await expect(page).toHaveURL(/maxPrice=1/);
  await expect(page.getByText("No offers match these filters")).toBeVisible();
  await page
    .getByRole("form", { name: "Filter empty legs" })
    .getByRole("button", { name: "Clear filters" })
    .click();
  await expect(page).toHaveURL(/\/empty-legs$/);
});

test("Empty legs is in the More menu", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await expect(
    page
      .getByRole("menuitem", { name: "Empty legs", exact: true })
      .or(page.getByRole("link", { name: "Empty legs", exact: true })),
  ).toHaveAttribute("href", "/empty-legs");
});

test("an operator adds an offer, operations approve it, customers see it, the operator withdraws it", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id: aircraftId, registration } = await approvedAircraft(
    page,
    browser,
  );

  // Draft, through the form (times are the departure airport's own).
  await page.goto("/operator/empty-legs/new");
  // The streamed server copy of the form is still in the document, hidden,
  // until the page hydrates; the submit button is enabled only after (D-095).
  await expect(page.getByRole("button", { name: "Save draft" })).toBeEnabled();
  const form = page.locator("form").filter({ visible: true });
  await page.getByRole("combobox", { name: "Aircraft" }).click();
  await page.getByRole("option", { name: new RegExp(registration) }).click();
  await page
    .getByRole("textbox", { name: "Find the departure airport" })
    .fill("GOI");
  await page.getByRole("combobox", { name: "Departs from" }).click();
  await page.getByRole("option").first().click();
  await page
    .getByRole("textbox", { name: "Find the arrival airport" })
    .fill("BOM");
  await page.getByRole("combobox", { name: "Arrives at" }).click();
  await page
    .getByRole("option", { name: /Mumbai/ })
    .first()
    .click();
  const from = inIndia(6, 10);
  const to = inIndia(6, 18);
  const valid = inIndia(5, 18);
  await form.getByLabel("Earliest departure, day").fill(from.day);
  await form.getByLabel("Earliest departure, time").fill(from.time);
  await form.getByLabel("Latest departure, day").fill(to.day);
  await form.getByLabel("Latest departure, time").fill(to.time);
  await form.getByLabel("Seats available").fill("5");
  await form.getByLabel("Price (₹)").fill("1,85,000");
  await form.getByLabel("Offer valid until, day").fill(valid.day);
  await form.getByLabel("Offer valid until, time").fill(valid.time);
  await form.getByLabel("Conditions").fill(CONDITIONS);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/operator\/empty-legs\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();

  // Not public yet (rule 4).
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  await visitor.goto(`/empty-legs/${id}`);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    /not found/i,
  );

  // Publishing waits for review.
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Under review", { exact: true })).toBeVisible();

  // Operations approve it.
  const staff = await asStaff(browser);
  await staff.page.goto("/admin/empty-legs");
  const row = staff.page
    .getByRole("listitem")
    .filter({ hasText: registration });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(
    staff.page.getByText("Offer approved", { exact: true }).first(),
  ).toBeVisible();
  await staff.context.close();

  // Customers see it, labelled, with its conditions before any request.
  await visitor.goto(`/empty-legs/${id}`);
  await expect(
    visitor.getByText("Quote", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    visitor.getByRole("heading", { name: "Conditions", exact: true }),
  ).toBeVisible();
  await expect(visitor.getByText(CONDITIONS)).toBeVisible();
  await expect(
    visitor.getByRole("link", { name: "Request this empty leg" }).first(),
  ).toHaveAttribute("href", `/book/empty-leg/${id}`);
  await expect(visitor.getByRole("link", { name: "Sign in" })).toBeVisible();

  // The operator withdraws it, after confirming.
  await page.reload();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await page.getByRole("button", { name: "Withdraw offer" }).click();
  await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible();
  await visitor.reload();
  await expect(
    visitor.getByRole("heading", { level: 1, name: "This offer has ended" }),
  ).toBeVisible();
  await anonymous.close();
  void aircraftId;
});

test("operations reject an offer with a reason; the operator sees it and the offer is a draft again", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id: aircraftId } = await approvedAircraft(page, browser);
  const offer = await draftOffer(page, aircraftId);
  await publishViaApi(page, offer.id);

  const staff = await asStaff(browser);
  await staff.page.goto("/admin/empty-legs");
  const row = staff.page
    .getByRole("listitem")
    .filter({ hasText: offer.reference });
  await row.getByRole("button", { name: "Reject" }).click();
  const dialog = staff.page.getByRole("dialog", { name: "Reject this offer" });
  await dialog
    .getByRole("textbox", { name: "Reason" })
    .fill("The window is too wide to be an empty leg.");
  await dialog.getByRole("button", { name: "Reject offer" }).click();
  await expect(
    staff.page.getByText("Offer rejected", { exact: true }).first(),
  ).toBeVisible();
  await staff.context.close();

  await page.goto(`/operator/empty-legs/${offer.id}`);
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(
    page.getByText("The window is too wide to be an empty leg."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
});

test("a customer finds a published offer, asks about it and follows it", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id: aircraftId } = await approvedAircraft(page, browser);
  const offer = await draftOffer(page, aircraftId);
  await publishViaApi(page, offer.id);
  await approveViaApi(browser, offer.id);

  const context = await browser.newContext();
  const customer = await context.newPage();
  await signIn(customer, "customer", "/empty-legs");
  await expect(
    customer.getByRole("heading", { level: 1, name: "Empty legs" }),
  ).toBeVisible();
  await customer.goto(`/empty-legs/${offer.id}`);

  const follow = customer.getByRole("button", { name: "Notify me of changes" });
  await follow.click();
  await expect(
    customer.getByRole("button", { name: "Stop notifying me" }),
  ).toBeVisible();
  await customer.reload();
  await customer.getByRole("button", { name: "Stop notifying me" }).click();
  await expect(
    customer.getByRole("button", { name: "Notify me of changes" }),
  ).toBeVisible();
  // Nothing here books or charges (rules 2 and 3).
  await expect(customer.getByText(/^book now$/i)).toHaveCount(0);
  await context.close();
});

test("operations see the queue in the admin navigation", async ({ page }) => {
  await signIn(page, "ops", "/admin/empty-legs");
  await expect(
    page.getByRole("heading", { level: 1, name: "Empty legs" }),
  ).toBeVisible();
});
