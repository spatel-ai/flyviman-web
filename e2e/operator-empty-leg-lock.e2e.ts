import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { API_URL } from "./support/api";
import { newCustomer } from "./support/bookings";
import { approvedAircraft, asStaff, csrf } from "./support/operators";

/**
 * D-213: while a customer's request on an empty-leg offer is live, the
 * operator's offer page is a read-only summary with a notice.
 * The offer helpers are small copies of those in `empty-legs.e2e.ts`.
 */
test("a requested offer is read-only for the operator: a notice, no Save and no Withdraw", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id: aircraftId } = await approvedAircraft(page, browser);
  const headers = await csrf(page);
  const place = async (code: string) =>
    (
      await (
        await page.request.get(`${API_URL}locations`, {
          params: { q: code, pageSize: 1 },
        })
      ).json()
    ).data[0].id as string;
  const at = (days: number, hour: number) =>
    new Date(Date.now() + days * 86_400_000 + hour * 3_600_000).toISOString();
  const created = await page.request.post(`${API_URL}operator/empty-legs`, {
    headers,
    data: {
      aircraftId,
      originId: await place("GOI"),
      destinationId: await place("BOM"),
      departureFrom: at(6, 4),
      departureTo: at(6, 12),
      seatsAvailable: 6,
      priceMinor: 18_500_000,
      validUntil: at(5, 12),
      conditions: "Subject to the aircraft repositioning as planned.",
    },
  });
  expect(created.status()).toBe(201);
  const offer = (await created.json()).data as { id: string };
  expect(
    (
      await page.request.post(
        `${API_URL}operator/empty-legs/${offer.id}/publish`,
        {
          headers,
        },
      )
    ).status(),
  ).toBe(200);
  const ops = await asStaff(browser);
  expect(
    (
      await ops.page.request.post(
        `${API_URL}admin/empty-legs/${offer.id}/approve`,
        {
          headers: await csrf(ops.page),
        },
      )
    ).status(),
  ).toBe(200);
  await ops.context.close();

  // Before any request the operator can still withdraw it.
  await page.goto(`/operator/empty-legs/${offer.id}`);
  await expect(page.getByRole("button", { name: "Withdraw" })).toBeVisible();

  // A customer requests it.
  const { page: customer } = await newCustomer(browser);
  const shown = (
    await (
      await customer.request.get(`${API_URL}empty-legs/${offer.id}`)
    ).json()
  ).data;
  const requested = await customer.request.post(
    `${API_URL}bookings/empty-leg`,
    {
      headers: { ...(await csrf(customer)), "Idempotency-Key": randomUUID() },
      data: {
        emptyLegId: offer.id,
        passengerCount: 2,
        expectedTotalMinor: shown.price.amountMinor,
        currency: "INR",
        cancellationTermsVersion: shown.cancellationTerms.version,
        offerUpdatedAt: shown.updatedAt,
      },
    },
  );
  expect(requested.status()).toBe(201);

  await page.goto(`/operator/empty-legs/${offer.id}`);
  const main = page.getByRole("main");
  await expect(
    main.getByText("A customer has requested this offer"),
  ).toBeVisible();
  await expect(main.getByText(/cannot be withdrawn/)).toBeVisible();
  await expect(main.getByRole("button", { name: /Save/ })).toHaveCount(0);
  await expect(main.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
  await expect(main.getByRole("textbox")).toHaveCount(0);
});
