import { describe, expect, it } from "vitest";
import {
  operatorDocumentLabel,
  parseExpiringFilter,
  serialiseExpiringFilter,
} from "./filters";

describe("expiring documents filter", () => {
  it("defaults to everything in the next 30 days", () => {
    expect(parseExpiringFilter(new URLSearchParams())).toEqual({
      kind: "ALL",
      withinDays: 30,
      page: 1,
    });
  });

  it("ignores values it does not know", () => {
    expect(
      parseExpiringFilter(new URLSearchParams("kind=X&within=45&page=-2")),
    ).toEqual({ kind: "ALL", withinDays: 30, page: 1 });
  });

  it("round-trips a view through the address", () => {
    const filter = { kind: "AIRCRAFT", withinDays: 7, page: 2 } as const;
    const search = serialiseExpiringFilter(filter);
    expect(search).toBe("kind=AIRCRAFT&within=7&page=2");
    expect(parseExpiringFilter(new URLSearchParams(search))).toEqual(filter);
    expect(
      serialiseExpiringFilter({ kind: "ALL", withinDays: 30, page: 1 }),
    ).toBe("");
  });

  it("names operator documents", () => {
    expect(operatorDocumentLabel("AOC")).toBe("Air operator certificate");
  });
});
