import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { appliesTo, listIsStale } from "./pricing-rules";

describe("appliesTo", () => {
  it("names all aircraft or the category", () => {
    expect(appliesTo({ scope: "PLATFORM", scopeRef: null })).toBe(
      "All aircraft",
    );
    expect(appliesTo({ scope: "CATEGORY", scopeRef: "TURBOPROP" })).toBe(
      "Turboprop",
    );
  });
});

describe("listIsStale", () => {
  it("refreshes the list when another admin got there first", () => {
    for (const code of [
      "PRICING_RULE_NOT_CURRENT",
      "PRICING_RULE_EXISTS",
      "NOT_FOUND",
    ]) {
      expect(listIsStale(new ApiError(409, code, "refused"))).toBe(true);
    }
  });

  it("leaves the list alone for other failures", () => {
    expect(listIsStale(new ApiError(400, "VALIDATION_ERROR", "bad"))).toBe(
      false,
    );
    expect(listIsStale(new Error("network"))).toBe(false);
  });
});
