import { describe, expect, it } from "vitest";
import {
  defaultValidity,
  quoteDefaults,
  quoteSchema,
  toReviseQuoteBody,
  type QuoteValues,
} from "./quote-schema";

const NOW = Date.parse("2030-01-10T06:00:00Z");
const DEPARTURE = "2030-01-20T04:30:00Z";
const schema = quoteSchema({ departureAt: DEPARTURE, now: () => NOW });

const valid: QuoteValues = {
  price: "1,80,000",
  validDate: "2030-01-12",
  validTime: "12:00",
  summary: "Free until 72 hours before.",
  charges: [
    { hours: "72", percent: "0" },
    { hours: "0", percent: "50" },
  ],
  inclusions: "Crew\n Fuel \n\n",
  exclusions: "Lounge",
};

function issues(values: Partial<QuoteValues>) {
  const result = schema.safeParse({ ...valid, ...values });
  return result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

describe("the quote body", () => {
  it("turns rupees into paise and India time into UTC", () => {
    expect(toReviseQuoteBody(valid)).toEqual({
      totalMinor: 18_000_000,
      currency: "INR",
      validUntil: "2030-01-12T06:30:00.000Z",
      conditions: {
        summary: "Free until 72 hours before.",
        charges: [
          { minHoursBeforeDeparture: 72, chargePercent: 0 },
          { minHoursBeforeDeparture: 0, chargePercent: 50 },
        ],
        inclusions: ["Crew", "Fuel"],
        exclusions: ["Lounge"],
      },
    });
  });

  it("keeps paise", () => {
    expect(toReviseQuoteBody({ ...valid, price: "2500.50" }).totalMinor).toBe(
      250_050,
    );
  });
});

describe("quote validation", () => {
  it("accepts a good quote", () => {
    expect(issues({})).toEqual([]);
  });

  it("needs a real amount in rupees", () => {
    expect(issues({ price: "" })).toEqual(["price: Enter your price"]);
    expect(issues({ price: "abc" })[0]).toMatch(/in rupees/);
    expect(issues({ price: "0" })).toEqual(["price: Enter at least ₹1"]);
    expect(issues({ price: "10,00,00,001" })[0]).toMatch(/price/);
    expect(issues({ price: "1,00,00,000" })).toEqual([]);
  });

  it("needs validity at least an hour ahead and not after departure", () => {
    // 11:00 IST on the 10th is 05:30Z: already past.
    expect(issues({ validDate: "2030-01-10", validTime: "11:00" })).toEqual([
      "validDate: Must be at least an hour from now",
    ]);
    expect(issues({ validDate: "2030-01-10", validTime: "12:29" })).toEqual([
      "validDate: Must be at least an hour from now",
    ]);
    expect(issues({ validDate: "2030-01-10", validTime: "12:30" })).toEqual([]);
    expect(issues({ validDate: "2030-01-21", validTime: "10:00" })).toEqual([
      "validDate: Cannot be after the departure",
    ]);
  });

  it("asks for the cancellation words", () => {
    expect(issues({ summary: "  " })).toHaveLength(1);
  });

  it("wants the longest notice first, each once, within bounds", () => {
    expect(
      issues({
        charges: [
          { hours: "24", percent: "10" },
          { hours: "24", percent: "20" },
        ],
      }),
    ).toEqual(["charges.1.hours: Longest notice first, each notice once"]);
    expect(issues({ charges: [{ hours: "1.5", percent: "101" }] })).toEqual([
      "charges.0.hours: Whole hours, 0 to 8760",
      "charges.0.percent: Whole percent, 0 to 100",
    ]);
    expect(issues({ charges: [] })).toEqual([]);
  });

  it("limits the lists", () => {
    expect(issues({ inclusions: "x".repeat(201) })).toHaveLength(1);
    expect(issues({ exclusions: Array(21).fill("a").join("\n") })).toHaveLength(
      1,
    );
  });
});

describe("defaults", () => {
  it("is 48 hours from now, in India time", () => {
    expect(defaultValidity(DEPARTURE, NOW)).toEqual({
      validDate: "2030-01-12",
      validTime: "11:30",
    });
  });

  it("is never after the departure", () => {
    expect(defaultValidity("2030-01-11T04:30:00Z", NOW)).toEqual({
      validDate: "2030-01-11",
      validTime: "10:00",
    });
  });

  it("starts a first quote from the terms the customer saw, a revision from the last quote", () => {
    const terms = {
      version: 1 as const,
      source: "PLATFORM" as const,
      summary: "Platform terms",
      charges: [{ minHoursBeforeDeparture: 48, chargePercent: 25 }],
      acceptedAt: "2030-01-09T00:00:00Z",
    };
    const legs = [{ departureAt: DEPARTURE }] as never;
    const first = quoteDefaults(
      { quotes: [], cancellationTerms: terms, legs },
      NOW,
    );
    expect(first).toMatchObject({
      price: "",
      summary: "Platform terms",
      charges: [{ hours: "48", percent: "25" }],
    });
    const revised = quoteDefaults(
      {
        quotes: [
          {
            price: { amountMinor: 61_000_050 },
            conditions: {
              summary: "Mine",
              charges: [],
              inclusions: ["Crew"],
              exclusions: [],
            },
          },
        ] as never,
        cancellationTerms: terms,
        legs,
      },
      NOW,
    );
    expect(revised).toMatchObject({
      price: "610000.5",
      summary: "Mine",
      charges: [],
      inclusions: "Crew",
    });
  });
});
