import { randomUUID } from "node:crypto";
import { expect, type Browser, type Page } from "@playwright/test";
import { API_URL, PASSWORD, latestCode, uniqueEmail } from "./api";
import { approvedAircraft, csrf } from "./operators";

function inDays(days: number, hourUtc = 6): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}

/**
 * A fresh approved operator (signed in on `page`) with its own aircraft, and
 * a request for it made by a fresh customer through the API: priced when
 * `priced`, otherwise "price on request". A new aircraft each time, so holds
 * never collide between tests.
 */
export async function requestedTrip(
  page: Page,
  browser: Browser,
  {
    priced,
    specialRequests,
    withPassenger = false,
    changeRequest,
  }: {
    priced: boolean;
    specialRequests?: string;
    /** Saves "Kavya Ramaswamy" and puts her on the booking. */
    withPassenger?: boolean;
    /** The customer then asks for this change. */
    changeRequest?: string;
  },
) {
  const aircraft = await approvedAircraft(page, browser);
  const headers = await csrf(page);
  const slot = await page.request.post(
    `${API_URL}operator/aircraft/${aircraft.id}/availability/slots`,
    {
      headers,
      data: {
        startsAt: inDays(3, 0).toISOString(),
        endsAt: inDays(6, 0).toISOString(),
        kind: "OPEN",
      },
    },
  );
  expect(slot.status()).toBe(201);
  if (priced) {
    const rate = await page.request.put(
      `${API_URL}operator/aircraft/${aircraft.id}/pricing`,
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
  }

  const context = await browser.newContext();
  const customer = context.request;
  const email = uniqueEmail("customer");
  const register = await customer.post(`${API_URL}auth/register`, {
    data: {
      firstName: "Asha",
      lastName: "Rao",
      email,
      password: PASSWORD,
      acceptTerms: true,
    },
  });
  expect(register.status()).toBe(202);
  const { verificationId } = (await register.json()).data;
  const verified = await customer.post(`${API_URL}auth/email/verify`, {
    data: { verificationId, code: await latestCode(customer, email) },
  });
  expect(verified.status()).toBe(200);
  const token = (await context.storageState()).cookies.find(
    (cookie) => cookie.name === "csrf_token",
  )?.value;
  const customerHeaders = { "X-CSRF-Token": token ?? "" };

  const place = async (code: string) =>
    (
      await (
        await customer.get(`${API_URL}locations`, {
          params: { q: code, pageSize: 1 },
        })
      ).json()
    ).data[0].id as string;
  const search = await customer.post(`${API_URL}search/charter`, {
    headers: customerHeaders,
    data: {
      originId: await place("BOM"),
      destinationId: await place("GOI"),
      departureAt: inDays(4).toISOString(),
      passengerCount: 2,
    },
  });
  expect(search.status()).toBe(200);
  const found = (await search.json()).data;
  const result = found.results.find(
    (entry: { aircraft: { id: string } }) => entry.aircraft.id === aircraft.id,
  );
  expect(result, "the new aircraft is in the results").toBeTruthy();
  // The Flyviman terms the result detail shows, agreed to with the request.
  const detail = await customer.get(
    `${API_URL}search/${found.searchId}/results/${result.resultId}`,
  );
  expect(detail.status()).toBe(200);
  let passengerIds: string[] | undefined;
  if (withPassenger) {
    const saved = await customer.post(`${API_URL}me/passengers`, {
      headers: customerHeaders,
      data: {
        firstName: "Kavya",
        lastName: "Ramaswamy",
        dateOfBirth: "1990-04-12",
        gender: "FEMALE",
        nationality: "IN",
      },
    });
    expect(saved.status()).toBe(201);
    passengerIds = [(await saved.json()).data.id as string];
  }
  const booking = await customer.post(`${API_URL}bookings`, {
    headers: { ...customerHeaders, "Idempotency-Key": randomUUID() },
    data: {
      searchId: found.searchId,
      resultId: result.resultId,
      cancellationTermsVersion: (await detail.json()).data.cancellationTerms
        .version as number,
      currency: "INR",
      ...(priced ? { expectedTotalMinor: result.price.amountMinor } : {}),
      ...(specialRequests ? { specialRequests } : {}),
      ...(passengerIds ? { passengerIds } : {}),
    },
  });
  expect(booking.status()).toBe(201);
  const reference = (await booking.json()).data.reference as string;
  if (changeRequest) {
    const change = await customer.post(
      `${API_URL}bookings/${reference}/change-requests`,
      { headers: customerHeaders, data: { details: changeRequest } },
    );
    expect(change.status()).toBe(201);
  }
  await context.close();
  return { ...aircraft, reference };
}
