import { describe, expect, it } from "vitest";
import {
  describeLimits,
  fromMatchingConfig,
  matchingLimitsSchema,
  toMatchingConfig,
} from "./schema";

const base = {
  minLegKm: "",
  maxLegKm: "",
  minRunwayM: "",
  minimumNoticeMinutes: "",
  landingSites: "" as const,
  reason: "Safety review",
};

describe("matchingLimitsSchema", () => {
  it("accepts no limits at all", () => {
    expect(matchingLimitsSchema.safeParse(base).success).toBe(true);
  });
  it("refuses decimals, out-of-range values and a short reason", () => {
    expect(
      matchingLimitsSchema.safeParse({ ...base, minRunwayM: "1.5" }).success,
    ).toBe(false);
    expect(
      matchingLimitsSchema.safeParse({ ...base, minimumNoticeMinutes: "10081" })
        .success,
    ).toBe(false);
    expect(
      matchingLimitsSchema.safeParse({ ...base, reason: "ab" }).success,
    ).toBe(false);
  });
  it("refuses a shortest leg above the longest", () => {
    const result = matchingLimitsSchema.safeParse({
      ...base,
      minLegKm: "500",
      maxLegKm: "100",
    });
    expect(result.success).toBe(false);
  });
});

describe("config mapping", () => {
  it("sends only the limits that are set", () => {
    expect(
      toMatchingConfig({
        ...base,
        minimumNoticeMinutes: "120",
        landingSites: "NOT_ALLOWED",
      }),
    ).toEqual({ minimumNoticeMinutes: 120, landingSites: "NOT_ALLOWED" });
    expect(toMatchingConfig(base)).toEqual({});
  });
  it("reads a stored config back into the form and into words", () => {
    const config = { minRunwayM: 900, landingSites: "ALLOWED" };
    expect(fromMatchingConfig(config).minRunwayM).toBe("900");
    expect(describeLimits(config)).toBe(
      "runway 900 m or more, landing sites allowed",
    );
    expect(describeLimits({})).toBe("No limits set");
  });
});
