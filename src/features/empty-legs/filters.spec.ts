import { describe, expect, it } from "vitest";
import {
  NO_FILTER,
  emptyLegQuery,
  isFiltered,
  parseEmptyLegFilter,
  serialiseEmptyLegFilter,
  windowError,
} from "./filters";

const parse = (query: string) =>
  parseEmptyLegFilter(new URLSearchParams(query));
const ID = "0b9a1f0e-2b1c-4c7e-8f0a-1a2b3c4d5e6f";

describe("parseEmptyLegFilter", () => {
  it("defaults to everything, first page", () => {
    expect(parse("")).toEqual(NO_FILTER);
  });

  it("reads a valid view", () => {
    expect(
      parse(
        `origin=${ID}&destination=${ID}&from=2026-12-01&to=2026-12-05&passengers=3&maxPrice=1,50,000&page=2`,
      ),
    ).toEqual({
      origin: ID,
      destination: ID,
      from: "2026-12-01",
      to: "2026-12-05",
      passengers: 3,
      maxPrice: "1,50,000",
      page: 2,
    });
  });

  it("falls back to defaults for values it does not know", () => {
    expect(
      parse("origin=BOM&from=tomorrow&passengers=0&maxPrice=cheap&page=-1"),
    ).toEqual(NO_FILTER);
  });
});

describe("serialiseEmptyLegFilter", () => {
  it("leaves defaults out and round-trips a view", () => {
    expect(serialiseEmptyLegFilter(NO_FILTER)).toBe("");
    const view = { ...NO_FILTER, origin: ID, passengers: 2, page: 3 };
    expect(parse(serialiseEmptyLegFilter(view))).toEqual(view);
  });
});

describe("emptyLegQuery", () => {
  it("sends the price as paise and leaves empty filters out", () => {
    const query = emptyLegQuery({ ...NO_FILTER, maxPrice: "2500.50" });
    expect(query.maxPrice).toBe(250050);
    expect(query.origin).toBeUndefined();
    expect(query.page).toBe(1);
  });
});

describe("isFiltered and windowError", () => {
  it("ignores the page when deciding whether a filter is set", () => {
    expect(isFiltered({ ...NO_FILTER, page: 4 })).toBe(false);
    expect(isFiltered({ ...NO_FILTER, passengers: 2 })).toBe(true);
  });

  it("rejects a window that ends before it starts", () => {
    expect(
      windowError({ ...NO_FILTER, from: "2026-12-05", to: "2026-12-01" }),
    ).toBeTruthy();
    expect(windowError({ ...NO_FILTER, from: "2026-12-01" })).toBeUndefined();
  });
});
