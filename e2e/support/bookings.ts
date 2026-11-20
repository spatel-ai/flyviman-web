import { randomUUID } from "node:crypto";
import { expect, type Browser, type Page } from "@playwright/test";
import { API_URL, latestCode, PASSWORD, uniqueEmail } from "./api";
import { approvedAircraft, csrf } from "./operators";

function inDays(days: number, hourUtc = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}

/** The operator's own price; Flyviman's charges and tax are added (D-172). */
const QUOTE = {
  operatorPriceMinor: 61_000_000,
  currency: "INR",
  conditions: {
    inclusions: ["Crew", "Fuel"],
    exclusions: ["Airport lounge"],
  },
};

/**
 * An approved light jet in Mumbai, open from day 3 to day 6. With `priced` it
 * has an hourly rate (results carry an `ESTIMATE`); without, results are
 * "price on request". The returned operator page stays signed in, for the
 * operator's own calls (quotes, questions).
 */
export async function listedJet(browser: Browser, priced: boolean) {
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
  if (priced) {
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
  }
  return { operator, aircraftId: id };
}

/** A newly registered customer, signed in on the returned page, with one saved passenger. */
export async function newCustomer(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = uniqueEmail("customer");
  const register = await page.request.post(`${API_URL}auth/register`, {
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
  const verify = await page.request.post(`${API_URL}auth/email/verify`, {
    data: { verificationId, code: await latestCode(page.request, email) },
  });
  expect(verify.status()).toBe(200);
  const saved = await page.request.post(`${API_URL}me/passengers`, {
    headers: await csrf(page),
    data: {
      firstName: "Kavya",
      lastName: "Ramaswamy",
      dateOfBirth: "1990-04-12",
      gender: "FEMALE",
      nationality: "IN",
    },
  });
  expect(saved.status()).toBe(201);
  return { page, passengerId: (await saved.json()).data.id as string };
}

async function locationId(page: Page, q: string) {
  const response = await page.request.get(`${API_URL}locations`, {
    params: { q, pageSize: 1 },
  });
  return (await response.json()).data[0].id as string;
}

/** Mumbai to Goa in four days for two; returns this aircraft's result. */
export async function searchFor(page: Page, aircraftId: string) {
  const response = await page.request.post(`${API_URL}search/charter`, {
    headers: await csrf(page),
    data: {
      originId: await locationId(page, "BOM"),
      destinationId: await locationId(page, "GOI"),
      departureAt: inDays(4).toISOString(),
      passengerCount: 2,
    },
  });
  expect(response.status()).toBe(200);
  const data = (await response.json()).data;
  const result = data.results.find(
    (r: { aircraft: { id: string } }) => r.aircraft.id === aircraftId,
  );
  return {
    searchId: data.searchId as string,
    resultId: result.resultId as string,
    price: result.price as { amountMinor: number } | null,
  };
}

/** Sends the booking request through the API, as the signed-in customer. */
export async function requestThroughApi(
  page: Page,
  searched: Awaited<ReturnType<typeof searchFor>>,
  passengerId: string,
) {
  // The Flyviman terms the result detail shows, agreed to with the request.
  const detail = await page.request.get(
    `${API_URL}search/${searched.searchId}/results/${searched.resultId}`,
  );
  expect(detail.status()).toBe(200);
  const response = await page.request.post(`${API_URL}bookings`, {
    headers: { ...(await csrf(page)), "Idempotency-Key": randomUUID() },
    data: {
      searchId: searched.searchId,
      resultId: searched.resultId,
      cancellationTermsVersion: (await detail.json()).data.cancellationTerms
        .version as number,
      currency: "INR",
      ...(searched.price
        ? { expectedTotalMinor: searched.price.amountMinor }
        : {}),
      passengerIds: [passengerId],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data.reference as string;
}

/** The operator sends a quote on a request. */
export async function sendQuote(operator: Page, reference: string) {
  const response = await operator.request.post(
    `${API_URL}operator/booking-requests/${reference}/revise-quote`,
    { headers: await csrf(operator), data: QUOTE },
  );
  expect(response.status()).toBe(201);
}

/** The operator asks the customer a question. */
export async function askQuestion(
  operator: Page,
  reference: string,
  message: string,
) {
  const response = await operator.request.post(
    `${API_URL}operator/booking-requests/${reference}/clarify`,
    { headers: await csrf(operator), data: { message } },
  );
  expect(response.status()).toBe(200);
}
