import { describe, expect, it } from "vitest";
import type { Schemas } from "@/lib/api/types";
import {
  applyFilters,
  facetCounts,
  NO_FILTERS,
  operatorOptions,
  readFilters,
  writeFilters,
} from "./filters";

type Result = Schemas["SearchResultDto"];

const result = (
  id: string,
  category: string,
  seats: number,
  minutes: number | null,
  price: number | null,
  operator = "Sky",
): Result =>
  ({
    resultId: id,
    aircraft: {
      id,
      manufacturer: "M",
      model: id,
      category,
      passengerCapacity: seats,
    },
    operatorName: operator,
    distanceKm: 500,
    flightMinutes: minutes,
    tripType: "ONE_WAY",
    returnAt: null,
    roundTripStrategy: null,
    price:
      price == null
        ? null
        : { priceType: "ESTIMATE", amountMinor: price, currency: "INR" },
    validUntil: "2026-12-01T00:00:00Z",
    warnings: [],
    incomplete: false,
  }) as Result;

const RESULTS = [
  result("a", "LIGHT_JET", 6, 70, 500, "Sky"),
  result("b", "MIDSIZE_JET", 9, 60, 800, "Aero"),
  result("c", "LIGHT_JET", 8, 90, null, "Aero"),
];
const ids = (list: Result[]) => list.map((r) => r.resultId);

describe("applyFilters", () => {
  it("sorts by price with prices on request last, by time, by seats", () => {
    expect(ids(applyFilters(RESULTS, NO_FILTERS, "price"))).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(ids(applyFilters(RESULTS, NO_FILTERS, "fastest"))).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(ids(applyFilters(RESULTS, NO_FILTERS, "seats"))).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("filters by class, operator, seats, time and price", () => {
    const only = (filters: Partial<typeof NO_FILTERS>) =>
      ids(applyFilters(RESULTS, { ...NO_FILTERS, ...filters }, "price"));
    expect(only({ classes: ["LIGHT_JET"] })).toEqual(["a", "c"]);
    expect(only({ operators: ["Aero"] })).toEqual(["b", "c"]);
    expect(only({ minSeats: 8 })).toEqual(["b", "c"]);
    expect(only({ maxMinutes: 75 })).toEqual(["a", "b"]);
    expect(
      ids(
        applyFilters(
          [result("d", "LIGHT_JET", 6, null, 300)],
          { ...NO_FILTERS, maxMinutes: 60 },
          "price",
        ),
      ),
    ).toEqual(["d"]);
    // A price on request is not hidden by a price limit.
    expect(only({ maxPriceMinor: 600 })).toEqual(["a", "c"]);
  });
});

describe("filters in the address", () => {
  it("round-trips and ignores nonsense", () => {
    const filters = { ...NO_FILTERS, classes: ["LIGHT_JET"], minSeats: 4 };
    const query = writeFilters(filters, "fastest");
    expect(readFilters(new URLSearchParams(query))).toEqual({
      filters,
      sort: "fastest",
    });
    expect(readFilters(new URLSearchParams("sort=bad&minSeats=-2"))).toEqual({
      filters: NO_FILTERS,
      sort: "price",
    });
  });
});

it("counts each option", () => {
  expect(facetCounts(RESULTS, (r) => r.aircraft.category)).toEqual([
    { value: "LIGHT_JET", count: 2 },
    { value: "MIDSIZE_JET", count: 1 },
  ]);
});

describe("operatorOptions", () => {
  const options = Array.from({ length: 12 }, (_, i) => ({
    value: `Operator ${String.fromCharCode(65 + i)}`,
    count: i === 11 ? 9 : 1,
  }));

  it("shows the 8 with most results first when collapsed", () => {
    const shown = operatorOptions(options, [], false, "");
    expect(shown).toHaveLength(8);
    expect(shown[0].value).toBe("Operator L");
  });

  it("keeps a selected operator visible beyond the cap", () => {
    const shown = operatorOptions(options, ["Operator K"], false, "");
    expect(shown.map((o) => o.value)).toContain("Operator K");
    expect(shown).toHaveLength(9);
  });

  it("shows all when expanded and narrows by the search, selected kept", () => {
    expect(operatorOptions(options, [], true, "")).toHaveLength(12);
    const found = operatorOptions(options, ["Operator A"], true, "operator k");
    expect(found.map((o) => o.value)).toEqual(["Operator K", "Operator A"]);
  });
});
