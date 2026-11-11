import { describe, expect, it } from "vitest";
import {
  emptyTitle,
  locationListQuery,
  parseLocationFilter,
  serialiseLocationFilter,
} from "./filters";

describe("parseLocationFilter", () => {
  it("defaults to every type and active locations", () => {
    expect(parseLocationFilter(new URLSearchParams())).toEqual({
      type: "ALL",
      isActive: "true",
      q: "",
      page: 1,
    });
  });

  it("reads a shared view and ignores unknown values", () => {
    const params = new URLSearchParams(
      "type=HELIPORT&isActive=false&q=kedarnath&page=2&type=bogus",
    );
    expect(parseLocationFilter(params)).toEqual({
      type: "HELIPORT",
      isActive: "false",
      q: "kedarnath",
      page: 2,
    });
  });
});

describe("serialiseLocationFilter and locationListQuery", () => {
  it("leave defaults out of the URL and the API query", () => {
    expect(
      serialiseLocationFilter({
        type: "ALL",
        isActive: "true",
        q: "",
        page: 1,
      }),
    ).toBe("");
    expect(
      locationListQuery({
        type: "AIRPORT",
        isActive: "ALL",
        q: "bom",
        page: 3,
      }),
    ).toEqual({
      type: "AIRPORT",
      isActive: undefined,
      q: "bom",
      page: 3,
      pageSize: 20,
    });
  });
});

describe("emptyTitle", () => {
  it("names the empty state from the current filter", () => {
    expect(
      emptyTitle({ type: "ALL", isActive: "true", q: "xyz", page: 1 }),
    ).toBe("No locations match your search");
    expect(emptyTitle({ type: "ALL", isActive: "false", q: "", page: 1 })).toBe(
      "No inactive locations",
    );
  });
});
