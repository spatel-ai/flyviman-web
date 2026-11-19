import { describe, expect, it } from "vitest";
import { isRestricted } from "./restricted";

const base = { before: null, after: null, reason: null };

describe("isRestricted", () => {
  it("is true for a pricing rule record with nothing returned", () => {
    expect(isRestricted({ ...base, entityType: "PricingRule" })).toBe(true);
  });

  it("is false when contents came back or for other entities", () => {
    expect(
      isRestricted({ ...base, entityType: "PricingRule", reason: "Q4" }),
    ).toBe(false);
    expect(isRestricted({ ...base, entityType: "User" })).toBe(false);
  });
});
