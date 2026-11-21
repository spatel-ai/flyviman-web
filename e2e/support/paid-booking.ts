import { expect, type Browser, type Page } from "@playwright/test";
import { API_URL, signIn } from "./api";
import {
  acceptRequest,
  listedJet,
  newCustomer,
  requestThroughApi,
  searchFor,
} from "./bookings";
import { csrf } from "./operators";

/**
 * A booking paid in full on the test checkout (as a customer would) and then
 * marked completed by operations, ready for the settlement job. Used by the
 * reports and settlements journeys, which need real money in the records.
 */
export async function completedPaidBooking(browser: Browser) {
  const { operator, aircraftId } = await listedJet(browser, true);
  const { page, passengerId } = await newCustomer(browser);
  const searched = await searchFor(page, aircraftId);
  const reference = await requestThroughApi(page, searched, passengerId);
  await acceptRequest(operator, reference);
  await operator.close();

  const main = page.getByRole("main");
  await page.goto(`/account/trips/${reference}/pay`);
  await main.getByRole("button", { name: /^Pay (now|deposit)$/ }).click();
  await page
    .getByRole("dialog", { name: "Test checkout" })
    .getByRole("button", { name: "Pay (test)" })
    .click();
  await expect(
    main.getByRole("heading", { name: "Payment received" }),
  ).toBeVisible();
  await page.context().close();

  // Operations moves it to completed (an override needs a reason).
  const ops = await browser.newPage();
  await signIn(ops, "ops", "/admin");
  await expect(ops).toHaveURL("/admin");
  const done = await ops.request.patch(
    `${API_URL}admin/bookings/${reference}/status`,
    {
      headers: await csrf(ops),
      data: { status: "COMPLETED", reason: "Trip flown, set up by a test" },
    },
  );
  expect(done.status()).toBe(200);
  await ops.close();
  return { reference };
}

/** Runs the settlement job until a settlement exists for the booking. */
export async function settlementFor(page: Page, reference: string) {
  type Row = {
    id: string;
    bookingReference: string;
    keptMinor: number;
    commissionMinor: number;
    taxMinor: number;
    payableMinor: number;
    status: string;
  };
  for (let attempt = 0; attempt < 15; attempt += 1) {
    // A job already running elsewhere answers "skipped": try again.
    const ran = await page.request.post(`${API_URL}dev/jobs/settlement-sync`, {
      headers: await csrf(page),
    });
    expect(ran.status()).toBe(200);
    const list = await page.request.get(`${API_URL}admin/settlements`, {
      params: { pageSize: 100 },
    });
    expect(list.status()).toBe(200);
    const row = ((await list.json()).data as Row[]).find(
      (entry) => entry.bookingReference === reference,
    );
    if (row) return row;
    await page.waitForTimeout(300);
  }
  throw new Error(`No settlement was made for ${reference}.`);
}
