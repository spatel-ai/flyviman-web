import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  API_URL,
  latestPasswordLink,
  PASSWORD,
  uniqueEmail,
} from "./support/api";
import { newCustomer } from "./support/bookings";
import { approvedAircraft, asStaff, csrf, PDF } from "./support/operators";

/**
 * The main journeys, each one test that drives the browser through every
 * role in turn (W5-6): charter from request to refund, an empty leg, and an
 * air ambulance mission. Operators, aircraft and accounts are set up through
 * the shared helpers; the journeys themselves are in the browser. Desktop
 * only: these are long, and the mobile layouts have their own files.
 */

test.describe.configure({ mode: "serial" });
test.skip(
  ({ isMobile }) => isMobile,
  "long multi-role journeys run on the desktop project",
);

/**
 * The shared registration helper has been seen to land on /operator instead
 * of /operator/onboarding under load; that attempt is thrown away and the
 * set-up runs once more with a fresh operator.
 */
async function retried<T>(make: () => Promise<T>): Promise<T> {
  try {
    return await make();
  } catch {
    return await make();
  }
}

function inDays(days: number, hourUtc = 6): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}

/** The two status badges of a trip page, which are never combined. */
const badges = (page: Page) => {
  const main = page.getByRole("main");
  const badge = (caption: RegExp) =>
    main.locator("span", { hasText: caption }).locator("[data-status]");
  return { booking: badge(/^Booking\s/), payment: badge(/^Payment\s/) };
};

/** Searches Mumbai to Goa in four days in the browser and opens `operatorName`'s result. */
async function searchAndOpen(page: Page, operatorName: string) {
  await page.goto("/search");
  const bom = page.getByRole("option", { name: /BOM/ });
  await expect(async () => {
    if (!(await bom.isVisible())) {
      await page.getByRole("button", { name: /^From:/ }).click();
    }
    await expect(bom).toBeVisible({ timeout: 1000 });
  }).toPass();
  await bom.click();
  await page.getByRole("button", { name: /^To:/ }).click();
  await page.getByRole("combobox", { name: "Search to airports" }).fill("GOI");
  await page.getByRole("option", { name: /GOI/ }).click();

  const day = inDays(4).toISOString().slice(0, 10);
  await page.getByRole("button", { name: /^Departure:/ }).click();
  await expect(page.getByText(/Lowest estimates per day/)).toBeVisible();
  const at = new Date(`${day}T00:00:00Z`);
  const monthName = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(at);
  if (!(await page.getByRole("grid", { name: monthName }).isVisible())) {
    await page.getByRole("button", { name: "Next month" }).click();
  }
  const dayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(at);
  await page
    .getByRole("grid", { name: monthName })
    .getByRole("button", { name: new RegExp(`^${dayLabel}`) })
    .click();
  await page.getByRole("button", { name: "11:00", exact: true }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}$/);
  const card = page
    .getByRole("list", { name: "Aircraft found" })
    .getByRole("listitem")
    .filter({ hasText: operatorName });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: /^Details:/ }).click();
  await expect(page).toHaveURL(/\/search\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
}

test("charter, from the customer's request to the refund: one booking in every role's view", async ({
  browser,
}) => {
  test.slow();
  test.setTimeout(480_000);
  const operatorContext = await browser.newContext();
  const operator = await operatorContext.newPage();
  const { id: aircraftId, legalName } = await retried(() =>
    approvedAircraft(operator, browser),
  );
  // Open from day 3 to day 6, no hourly rate: "price on request".
  const slot = await operator.request.post(
    `${API_URL}operator/aircraft/${aircraftId}/availability/slots`,
    {
      headers: await csrf(operator),
      data: {
        startsAt: inDays(3, 0).toISOString(),
        endsAt: inDays(6, 0).toISOString(),
        kind: "OPEN",
      },
    },
  );
  expect(slot.status()).toBe(201);
  const { page } = await newCustomer(browser);
  let reference = "";

  await test.step("customer: searches in the browser and requests the flight", async () => {
    await searchAndOpen(page, legalName);
    await expect(page.getByText(/cancellation/i).first()).toBeVisible();
    await page
      .getByRole("link", { name: "Request this flight" })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/book\//);
    await page.getByRole("checkbox", { name: "Kavya Ramaswamy" }).check();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page).toHaveURL(/\/account\/trips\/FLY-BK-[A-Z0-9]+$/, {
      timeout: 45_000,
    });
    reference = /FLY-BK-[A-Z0-9]+/.exec(page.url())![0];
    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(reference) }),
    ).toBeVisible();
    await expect(page.getByText(/Awaiting operator/i).first()).toBeVisible();
  });

  await test.step("operator: sends a quote; the request reads Awaiting customer", async () => {
    await operator.goto("/operator/requests");
    await operator
      .getByRole("main")
      .getByRole("link", { name: reference })
      .click();
    const main = operator.getByRole("main");
    await expect(
      main.getByRole("heading", { level: 1, name: `Request ${reference}` }),
    ).toBeVisible();
    await operator.getByRole("button", { name: "Send a quote" }).click();
    const dialog = operator.getByRole("dialog", { name: "Send a quote" });
    await dialog.getByRole("textbox", { name: /Your price/ }).fill("5,12,000");
    await dialog
      .getByRole("textbox", { name: "What the price includes" })
      .fill("Crew and fuel\nLanding and parking charges");
    await dialog.getByRole("button", { name: "Send quote" }).click();
    await expect(main.getByText(/Awaiting customer/i).first()).toBeVisible();
  });

  await test.step("customer: accepts the quote and pays on the test checkout; two badges, then the receipt", async () => {
    await page.goto(`/account/trips/${reference}`);
    const main = page.getByRole("main");
    await expect(
      main.getByText("Quote", { exact: true }).first(),
    ).toBeVisible();
    await main.getByRole("button", { name: "Accept quote" }).first().click();
    const accept = page.getByRole("dialog", { name: "Accept this quote?" });
    await expect(accept.getByText(/cancellation/i).first()).toBeVisible();
    await accept.getByRole("button", { name: "Accept quote" }).click();
    await expect(
      main.getByRole("heading", { name: /Payment due/ }),
    ).toBeVisible();
    await main.getByRole("link", { name: /^Pay/ }).click();
    await expect(page).toHaveURL(
      new RegExp(`/account/trips/${reference}/pay$`),
    );
    await expect(main.getByLabel("Amount due now")).toBeVisible();
    await expect(main.getByText(/cancell/i).first()).toBeVisible();
    await main.getByRole("button", { name: /^Pay (now|deposit)$/ }).click();
    await page
      .getByRole("dialog", { name: "Test checkout" })
      .getByRole("button", { name: "Pay (test)" })
      .click();
    await expect(
      main.getByRole("heading", { name: "Payment received" }),
    ).toBeVisible();

    await page.goto(`/account/trips/${reference}`);
    await expect(badges(page).payment).toHaveText(/^(Paid|Partially paid)$/);
    await expect(badges(page).booking).toHaveText("Confirmed");
    await main
      .getByRole("link", { name: /Receipt for/ })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Payment receipt" }),
    ).toBeVisible();
    await expect(page.getByText(reference).first()).toBeVisible();
  });

  const ops = await asStaff(browser, "ops");
  await test.step("operations: find the booking, assign it, add a note", async () => {
    await ops.page.goto("/admin/bookings");
    const main = ops.page.getByRole("main");
    await main.getByRole("textbox", { name: "Search" }).fill(reference);
    await main.getByRole("button", { name: "Search" }).click();
    await main.getByRole("link", { name: reference }).click();
    await expect(
      main.getByRole("heading", { level: 1, name: `Booking ${reference}` }),
    ).toBeVisible();
    await main.getByRole("button", { name: "Assign to me" }).click();
    await expect(ops.page.getByText("Owner set").first()).toBeVisible();
    await main
      .getByRole("textbox", { name: "Add a note" })
      .fill("Paid in full; operator to schedule the trip");
    await main.getByRole("button", { name: "Add note" }).click();
    await expect(
      main.getByText("Paid in full; operator to schedule the trip"),
    ).toBeVisible();
  });
  await ops.context.close();

  await test.step("operator: marks the trip scheduled", async () => {
    await operator.goto("/operator/bookings");
    await operator
      .getByRole("main")
      .getByRole("link", { name: reference })
      .click();
    await expect(
      operator.getByRole("heading", {
        level: 1,
        name: `Booking ${reference}`,
      }),
    ).toBeVisible();
    await operator.getByRole("button", { name: "Mark scheduled" }).click();
    await operator
      .getByRole("dialog", { name: "Mark this trip scheduled?" })
      .getByRole("button", { name: "Mark scheduled" })
      .click();
    // The timeline notification repeats the words (D-194); the toast is the one with the text itself.
    await expect(
      operator.getByText("Trip marked scheduled", { exact: true }),
    ).toBeVisible();
  });

  await test.step("customer: cancels, the charge is shown before confirming", async () => {
    await page.goto(`/account/trips/${reference}`);
    await page.getByRole("button", { name: "Cancel this trip" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancel this trip?" });
    await expect(dialog.getByText(/Cancellation charge/).first()).toBeVisible();
    await dialog
      .getByRole("textbox", { name: /Reason/ })
      .fill("Plans changed, the meeting moved");
    await dialog.getByRole("button", { name: "Cancel this trip" }).click();
    await expect(
      page.getByText("Trip cancelled", { exact: true }).first(),
    ).toBeVisible();
  });

  const finance = await asStaff(browser, "finance");
  await test.step("finance: sees the refund under Due and issues it with a reason", async () => {
    await finance.page.goto("/admin/refunds");
    const row = finance.page.getByRole("row", { name: new RegExp(reference) });
    await expect(row.first()).toBeVisible();
    await finance.page
      .getByRole("button", { name: `Refund ${reference}` })
      .click();
    const dialog = finance.page.getByRole("dialog", {
      name: `Refund ${reference}`,
    });
    const amount = dialog.getByRole("textbox", { name: /Amount to refund/ });
    await expect(amount).not.toHaveValue("");
    await dialog
      .getByRole("textbox", { name: "Reason" })
      .fill("Customer cancelled; refund less the cancellation charge");
    await dialog.getByRole("button", { name: "Refund", exact: true }).click();
    await expect(
      finance.page.getByText("Refund started", { exact: true }),
    ).toBeVisible();

    // Rule 2 and the audit trail: the refund is now in History under the
    // same booking reference.
    await finance.page.goto("/admin/refunds");
    await finance.page.getByRole("tab", { name: "History" }).click();
    await expect(
      finance.page.getByRole("row", { name: new RegExp(reference) }).first(),
    ).toBeVisible();
  });
  await finance.context.close();
  await operator.close();
  await page.close();
});

async function locationId(page: Page, code: string) {
  const response = await page.request.get(`${API_URL}locations`, {
    params: { q: code, pageSize: 1 },
  });
  return (await response.json()).data[0].id as string;
}

const CONDITIONS = "Subject to the aircraft repositioning as planned.";

/** A calendar day and time `days` from now, in India's time. */
function inIndia(days: number, hour: number) {
  const day = new Date(Date.now() + days * 86_400_000 + 5.5 * 3_600_000);
  return {
    day: day.toISOString().slice(0, 10),
    time: `${String(hour).padStart(2, "0")}:00`,
  };
}

test("empty leg: posted by the operator, requested with terms shown, gone from the list, accepted, read-only", async ({
  browser,
}) => {
  test.slow();
  test.setTimeout(420_000);
  const operatorContext = await browser.newContext();
  const operator = await operatorContext.newPage();
  const { registration } = await retried(() =>
    approvedAircraft(operator, browser),
  );
  const { page: customer } = await newCustomer(browser);
  let id = "";

  await test.step("operator: posts an offer in the browser; operations approve it", async () => {
    await operator.goto("/operator/empty-legs/new");
    await operator.getByRole("combobox", { name: "Aircraft" }).click();
    await operator
      .getByRole("option", { name: new RegExp(registration) })
      .click();
    await operator
      .getByRole("textbox", { name: "Find the departure airport" })
      .fill("GOI");
    await operator.getByRole("combobox", { name: "Departs from" }).click();
    await operator.getByRole("option").first().click();
    await operator
      .getByRole("textbox", { name: "Find the arrival airport" })
      .fill("BOM");
    await operator.getByRole("combobox", { name: "Arrives at" }).click();
    await operator
      .getByRole("option", { name: /Mumbai/ })
      .first()
      .click();
    const from = inIndia(6, 10);
    const to = inIndia(6, 18);
    const valid = inIndia(5, 18);
    await operator.getByLabel("Earliest departure, day").fill(from.day);
    await operator.getByLabel("Earliest departure, time").fill(from.time);
    await operator.getByLabel("Latest departure, day").fill(to.day);
    await operator.getByLabel("Latest departure, time").fill(to.time);
    await operator.getByLabel("Seats available").fill("5");
    // An odd price, so the customer's filtered list holds only this offer.
    await operator.getByLabel("Price (₹)").fill("1,23,000");
    await operator.getByLabel("Offer valid until, day").fill(valid.day);
    await operator.getByLabel("Offer valid until, time").fill(valid.time);
    await operator.getByLabel("Conditions").fill(CONDITIONS);
    await operator.getByRole("button", { name: "Save draft" }).click();
    await expect(operator).toHaveURL(/\/operator\/empty-legs\/[0-9a-f-]{36}$/);
    id = operator.url().split("/").pop()!;
    await operator.getByRole("button", { name: "Publish" }).click();
    await expect(
      operator.getByText("Under review", { exact: true }),
    ).toBeVisible();

    const staff = await asStaff(browser);
    await staff.page.goto("/admin/empty-legs");
    const row = staff.page
      .getByRole("listitem")
      .filter({ hasText: registration });
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(
      staff.page.getByText("Offer approved", { exact: true }).first(),
    ).toBeVisible();
    await staff.context.close();
  });

  const [origin, destination] = [
    await locationId(customer, "GOI"),
    await locationId(customer, "BOM"),
  ];
  const listUrl = `/empty-legs?origin=${origin}&destination=${destination}&maxPrice=123000`;
  const listed = customer.locator(`a[href="/empty-legs/${id}"]`);

  await test.step("customer: finds it, sees the terms before the submit and a price labelled Quote", async () => {
    await customer.goto(listUrl);
    await expect(listed.first()).toBeVisible();
    await listed.first().click();
    await expect(customer).toHaveURL(new RegExp(`/empty-legs/${id}$`));
    await expect(
      customer.getByText("Quote", { exact: true }).first(),
    ).toBeVisible();
    await customer
      .getByRole("link", { name: "Request this empty leg" })
      .filter({ visible: true })
      .first()
      .click();
    await expect(customer).toHaveURL(/\/book\/empty-leg\//);
    await expect(
      customer.getByRole("heading", {
        level: 1,
        name: "Request this empty leg",
      }),
    ).toBeVisible();
    await expect(
      customer.getByText("Quote", { exact: true }).first(),
    ).toBeVisible();
    // Rule 9: the conditions sit above the button that commits.
    const terms = await customer
      .getByText("Cancellation conditions")
      .first()
      .boundingBox();
    const send = customer.getByRole("button", { name: "Send request" });
    await expect(send).toBeVisible();
    expect(terms!.y).toBeLessThan((await send.boundingBox())!.y);
    await customer.getByRole("checkbox", { name: "Kavya Ramaswamy" }).check();
    await send.click();
    await expect(customer).toHaveURL(/\/account\/trips\/FLY-BK-[A-Z0-9]+$/, {
      timeout: 45_000,
    });
    await expect(
      customer.getByText(/Awaiting operator/i).first(),
    ).toBeVisible();
  });
  const reference = /FLY-BK-[A-Z0-9]+/.exec(customer.url())![0];

  await test.step("the offer has left the public list and cannot be opened for another request", async () => {
    await customer.goto(listUrl);
    await expect(
      customer.getByText("No offers match these filters"),
    ).toBeVisible();
    await expect(listed).toHaveCount(0);
  });

  await test.step("operator: accepts the request in Requests", async () => {
    await operator.goto(`/operator/requests/${reference}`);
    await operator.getByRole("button", { name: "Accept", exact: true }).click();
    await operator.getByRole("button", { name: "Accept request" }).click();
    await expect(
      operator.getByRole("main").getByText("Awaiting payment").first(),
    ).toBeVisible();
  });

  await test.step("the offer page is read-only: nothing to withdraw or change", async () => {
    await operator.goto(`/operator/empty-legs/${id}`);
    await expect(
      operator.getByText("A customer has requested this offer"),
    ).toBeVisible();
    await expect(
      operator.getByRole("button", { name: "Withdraw", exact: true }),
    ).toHaveCount(0);
    await expect(
      operator.getByRole("button", { name: /Save changes/ }),
    ).toHaveCount(0);
    await expect(operator.getByLabel("Price (₹)")).toHaveCount(0);
  });
  await customer.close();
  await operatorContext.close();
});

const CONDITION = "Post-operative cardiac patient, stable on monitoring";
const PICKUP = "City Hospital, Ward 4";

async function chooseLocation(
  page: Page,
  searchLabel: string,
  label: string,
  code: string,
) {
  await page.getByRole("textbox", { name: searchLabel }).fill(code);
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page
    .getByRole("option", { name: new RegExp(`\\b${code}\\)`) })
    .first()
    .click();
}

/** The invitee follows the emailed link, chooses a password and signs in. */
async function acceptInvitation(browser: Browser, email: string) {
  const context = await browser.newContext();
  const staff = await context.newPage();
  await staff.goto(await latestPasswordLink(staff.request, email));
  await staff
    .getByRole("textbox", { name: "New password", exact: true })
    .fill(PASSWORD);
  await staff
    .getByRole("textbox", { name: "Repeat the new password" })
    .fill(PASSWORD);
  await staff.getByRole("button", { name: "Set password" }).click();
  await staff.getByRole("link", { name: "Sign in" }).click();
  await staff.getByRole("textbox", { name: "Email" }).fill(email);
  await staff.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await staff.getByRole("button", { name: "Sign in" }).click();
  await expect(staff).toHaveURL(/\/operator$/);
  return { context, staff };
}

test("air ambulance: a request, operations' quotation, the operator admin sees the mission, staff do not, nothing confirmed automatically", async ({
  browser,
}) => {
  test.slow();
  test.setTimeout(480_000);
  const operatorContext = await browser.newContext();
  const operator = await operatorContext.newPage();
  const { legalName, registration } = await retried(() =>
    approvedAircraft(operator, browser, undefined, "AIR_AMBULANCE_FIXED"),
  );
  const { page } = await newCustomer(browser);
  let reference = "";
  const main = page.getByRole("main");

  await test.step("customer: submits a request with the emergency notice in view; it is not confirmed", async () => {
    await page.goto("/air-ambulance");
    const notice = page.getByRole("complementary", { name: "Emergency" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("call 112");
    const form = page.getByRole("form", { name: "Air ambulance request" });
    await form.getByRole("textbox", { name: "Your name" }).fill("Asha Rao");
    await form
      .getByRole("textbox", { name: "Phone", exact: true })
      .fill("+919800000001");
    await chooseLocation(
      page,
      "Find the airport or helipad nearest the patient",
      "From",
      "BOM",
    );
    await chooseLocation(
      page,
      "Find the airport or helipad nearest the receiving facility",
      "To",
      "DEL",
    );
    await form
      .getByRole("textbox", { name: "Collection address (optional)" })
      .fill(PICKUP);
    await form.getByLabel("Preferred date").fill("2030-01-15");
    await form.getByLabel("Preferred time (India time)").fill("09:30");
    await form
      .getByRole("textbox", { name: "Patient's condition" })
      .fill(CONDITION);
    await form.getByRole("combobox", { name: "Mobility" }).click();
    await page
      .getByRole("option", { name: "Cannot walk (bed or stretcher)" })
      .click();
    await form.getByRole("checkbox", { name: "Stretcher needed" }).click();
    await form.getByLabel("Add documents").setInputFiles({
      name: "discharge-summary.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
    await form.getByRole("button", { name: "Send request" }).click();
    await expect(page).toHaveURL(
      /\/account\/air-ambulance\/FLY-AA-[A-Z0-9]{6}\?sent=1$/,
    );
    reference = /FLY-AA-[A-Z0-9]{6}/.exec(page.url())![0];
    await expect(main.getByText("Request received").first()).toBeVisible();
    await expect(main.getByText(/not confirmed/i).first()).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Emergency" }),
    ).toBeVisible();
    await expect(main.getByText("Confirmed", { exact: true })).toHaveCount(0);
  });

  const ops = await asStaff(browser, "ops");
  const opsMain = ops.page.getByRole("main");
  await test.step("operations: take it, pick the operator, send a quotation", async () => {
    await ops.page.goto(`/admin/air-ambulance/${reference}`);
    await opsMain.getByRole("button", { name: "Take request" }).click();
    await expect(opsMain.getByText(CONDITION)).toBeVisible();
    await opsMain.getByRole("button", { name: "Start sourcing" }).click();
    await opsMain
      .getByRole("button", { name: "Start feasibility check" })
      .click();
    const checklist = opsMain.getByRole("form", {
      name: "Feasibility checklist",
    });
    await expect(checklist.getByRole("checkbox")).toHaveCount(9);
    for (const box of await checklist.getByRole("checkbox").all()) {
      await box.click();
    }
    await checklist.getByRole("button", { name: "Save checklist" }).click();
    await expect(
      checklist.getByText("9 of 9 checked, saved complete."),
    ).toBeVisible();
    const quote = opsMain.getByRole("form", { name: "Quote" });
    await quote.getByRole("combobox", { name: "Operator" }).click();
    await ops.page.getByRole("option", { name: legalName }).click();
    await quote.getByRole("textbox", { name: "Amount (₹)" }).fill("450000");
    await quote
      .getByRole("textbox", { name: "Conditions" })
      .fill("Free cancellation until the aircraft is dispatched.");
    await quote.getByRole("button", { name: "Send quote" }).click();
    await expect(opsMain.getByText("Quote ready").first()).toBeVisible();
  });

  await test.step("customer: sees the labelled quotation and accepts it", async () => {
    await page.goto(`/account/air-ambulance/${reference}`);
    const quoteSection = main.getByRole("region", { name: "Quote" });
    await expect(
      quoteSection.getByText("Quoted by the operator"),
    ).toBeVisible();
    await quoteSection.getByRole("button", { name: "Accept quote" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Accept quote" })
      .click();
    await expect(
      main.getByText("Quote accepted, request pending").first(),
    ).toBeVisible();
  });

  await test.step("the operator admin sees the mission with its medical details", async () => {
    await operator.goto("/operator/air-ambulance");
    const operatorMain = operator.getByRole("main");
    await operatorMain.getByRole("link", { name: reference }).click();
    await expect(operator).toHaveURL(`/operator/air-ambulance/${reference}`);
    await expect(
      operator.getByRole("heading", { name: "Medical details" }),
    ).toBeVisible();
    await expect(operatorMain.getByText(CONDITION)).toBeVisible();
    await expect(operatorMain.getByText(PICKUP)).toBeVisible();
    await expect(operatorMain.getByText("Asha Rao")).toHaveCount(0);
    await expect(
      operatorMain.getByText("Confirmed", { exact: true }),
    ).toHaveCount(0);
  });

  await test.step("operator staff, invited by the admin, see none of it", async () => {
    const email = uniqueEmail("staff");
    await operator.goto("/operator/team");
    await operator
      .getByRole("button", { name: "Invite a staff member" })
      .click();
    const dialog = operator.getByRole("dialog", {
      name: "Invite a staff member",
    });
    await dialog.getByRole("textbox", { name: "Email" }).fill(email);
    await dialog.getByRole("checkbox", { name: "Manage availability" }).click();
    await dialog
      .getByRole("checkbox", { name: new RegExp(`^${registration} `) })
      .click();
    await dialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(
      operator
        .getByText(`Invitation sent to ${email}`, { exact: true })
        .first(),
    ).toBeVisible();

    const { context, staff } = await acceptInvitation(browser, email);
    await staff.goto(`/operator/air-ambulance/${reference}`);
    const staffMain = staff.getByRole("main");
    await expect(staffMain).toBeVisible();
    await expect(
      staff.getByRole("heading", { name: "Medical details" }),
    ).toHaveCount(0);
    for (const secret of [CONDITION, PICKUP, "discharge-summary.pdf"]) {
      await expect(staff.getByText(secret)).toHaveCount(0);
    }
    await staff.goto("/operator/air-ambulance");
    await expect(staff.getByRole("link", { name: reference })).toHaveCount(0);
    await context.close();
  });

  await test.step("rule 7: operations alone confirm, and the button is still theirs to press", async () => {
    await ops.page.reload();
    await expect(
      opsMain.getByRole("button", { name: "Confirm mission" }),
    ).toBeVisible();
    await expect(opsMain.getByText("Confirmed", { exact: true })).toHaveCount(
      0,
    );
    await page.reload();
    await expect(main.getByText("Confirmed", { exact: true })).toHaveCount(0);
  });
  await ops.context.close();
  await operatorContext.close();
  await page.close();
});
