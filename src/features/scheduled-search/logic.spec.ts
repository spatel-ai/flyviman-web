import { describe, expect, it } from "vitest";
import {
  applyFilters,
  isExpired,
  NO_FILTERS,
  readFilters,
  sortOffers,
  timeOfDay,
  totalMinutes,
  writeFilters,
} from "./logic";
import type { ScheduledOffer } from "./types";

const LOC = {
  id: "l",
  name: "Airport",
  iata: "AAA",
  icao: null,
  timeZone: "Asia/Kolkata",
};

function offer(
  id: string,
  over: {
    price?: number;
    depart?: string;
    arrive?: string;
    carrier?: string;
    stops?: number;
  } = {},
): ScheduledOffer {
  return {
    offerId: id,
    carrier: { code: over.carrier ?? "AI", name: over.carrier ?? "Air" },
    segments: [
      {
        from: LOC,
        to: LOC,
        departAt: over.depart ?? "2030-01-01T02:30:00.000Z", // 08:00 IST
        arriveAt: over.arrive ?? "2030-01-01T04:30:00.000Z",
        flightNumber: "AI 1",
        durationMinutes: 120,
      },
    ],
    direction: "OUTBOUND",
    stops: over.stops ?? 0,
    fare: {
      amountMinor: over.price ?? 500000,
      currency: "INR",
      priceType: "LIVE_FARE",
      fareFamily: "Saver",
    },
    baggage: { cabinKg: 7, checkedKg: 15 },
    refundable: false,
    validUntil: "2030-01-01T00:00:00.000Z",
  };
}

describe("sortOffers", () => {
  const a = offer("a", {
    price: 900,
    depart: "2030-01-01T01:00:00Z",
    arrive: "2030-01-01T05:00:00Z",
  });
  const b = offer("b", {
    price: 300,
    depart: "2030-01-01T03:00:00Z",
    arrive: "2030-01-01T04:00:00Z",
  });
  it("by price, departure and duration, without changing the input", () => {
    const input = [a, b];
    expect(sortOffers(input, "price").map((o) => o.offerId)).toEqual([
      "b",
      "a",
    ]);
    expect(sortOffers(input, "departure").map((o) => o.offerId)).toEqual([
      "a",
      "b",
    ]);
    expect(sortOffers(input, "duration").map((o) => o.offerId)).toEqual([
      "b",
      "a",
    ]);
    expect(input.map((o) => o.offerId)).toEqual(["a", "b"]);
  });
  it("counts the whole journey as its duration", () => {
    expect(totalMinutes(a)).toBe(240);
  });
});

describe("applyFilters", () => {
  const offers = [
    offer("direct", { stops: 0, carrier: "AI" }),
    offer("one", { stops: 1, carrier: "6E" }),
    offer("three", { stops: 3, carrier: "6E", depart: "2030-01-01T14:00:00Z" }), // 19:30 IST
  ];
  it("keeps everything with no filters", () => {
    expect(applyFilters(offers, NO_FILTERS)).toHaveLength(3);
  });
  it("filters by stops, two meaning two or more", () => {
    const ids = (stops: number[]) =>
      applyFilters(offers, { ...NO_FILTERS, stops }).map((o) => o.offerId);
    expect(ids([0])).toEqual(["direct"]);
    expect(ids([2])).toEqual(["three"]);
    expect(ids([0, 1])).toEqual(["direct", "one"]);
  });
  it("filters by carrier and time of day in the airport's own zone", () => {
    expect(
      applyFilters(offers, { ...NO_FILTERS, carriers: ["6E"] }),
    ).toHaveLength(2);
    expect(
      applyFilters(offers, { ...NO_FILTERS, times: ["evening"] }).map(
        (o) => o.offerId,
      ),
    ).toEqual(["three"]);
    expect(
      applyFilters(offers, { ...NO_FILTERS, times: ["morning"] }),
    ).toHaveLength(2);
  });
  it("names the parts of the day", () => {
    expect([0, 5, 6, 11, 12, 17, 18, 23].map(timeOfDay)).toEqual([
      "night",
      "night",
      "morning",
      "morning",
      "afternoon",
      "afternoon",
      "evening",
      "evening",
    ]);
  });
});

describe("isExpired", () => {
  const until = "2030-01-01T00:00:00.000Z";
  it("is false before, true at and after validUntil", () => {
    const t = Date.parse(until);
    expect(isExpired({ validUntil: until }, t - 1)).toBe(false);
    expect(isExpired({ validUntil: until }, t)).toBe(true);
    expect(isExpired({ validUntil: until }, t + 1)).toBe(true);
  });
  it("does not judge before the clock is known", () => {
    expect(isExpired({ validUntil: until }, 0)).toBe(false);
  });
});

describe("filters in the address", () => {
  it("round-trips", () => {
    const filters = {
      stops: [0, 2],
      carriers: ["AI"],
      times: ["morning" as const],
    };
    const text = writeFilters(filters, "duration");
    expect(readFilters(new URLSearchParams(text))).toEqual({
      filters,
      sort: "duration",
    });
  });
  it("ignores values it does not know", () => {
    const { filters, sort } = readFilters(
      new URLSearchParams("sort=x&stops=9&time=noon"),
    );
    expect(sort).toBe("price");
    expect(filters).toEqual(NO_FILTERS);
  });
});
