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
      operatorPriceMinor: 18_000_000,
      currency: "INR",
      validUntil: "2030-01-12T06:30:00.000Z",
      conditions: {
        inclusions: ["Crew", "Fuel"],
        exclusions: ["Lounge"],
      },
    });
  });

  it("keeps paise", () => {
    expect(
      toReviseQuoteBody({ ...valid, price: "2500.50" }).operatorPriceMinor,
    ).toBe(250_050);
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

  it("starts a first quote blank, a revision from the operator's own last price", () => {
    const legs = [{ departureAt: DEPARTURE }] as never;
    expect(quoteDefaults({ quotes: [], legs }, NOW)).toMatchObject({
      price: "",
    });
    const conditions = {
      summary: "Flyviman terms",
      charges: [],
      inclusions: ["Crew"],
      exclusions: [],
    };
    const revised = quoteDefaults(
      {
        quotes: [
          {
            // The customer's total carries Flyviman's charges: never reused.
            price: { amountMinor: 72_000_000 },
            operatorPrice: { amountMinor: 61_000_050 },
            conditions,
          },
        ] as never,
        legs,
      },
      NOW,
    );
    expect(revised).toMatchObject({ price: "610000.5", inclusions: "Crew" });
    // A quote sent before quotes were priced from the operator's price.
    const older = quoteDefaults(
      {
        quotes: [
          {
            price: { amountMinor: 72_000_000 },
            operatorPrice: null,
            conditions,
          },
        ] as never,
        legs,
      },
      NOW,
    );
    expect(older.price).toBe("");
  });
});
