import { describe, expect, it } from "vitest";
import {
  fromOperatorPricing,
  operatorPricingSchema,
  toOperatorPricingBody,
} from "./schema";

const values = {
  minBillableHours: "1.5",
  positioningPercent: "80",
  freeWithinKm: "50",
  landingFallback: "15,000",
  handlingFallback: "5000",
};

describe("operator pricing form", () => {
  it("sends percentages as factors and rupees as paise", () => {
    expect(toOperatorPricingBody(operatorPricingSchema.parse(values))).toEqual({
      minBillableHours: 1.5,
      positioningRateFactor: 0.8,
      freeWithinKm: 50,
      landingFallbackMinor: 1_500_000,
      handlingFallbackMinor: 500_000,
    });
  });

  it("sends empty fields as not set", () => {
    const empty = {
      minBillableHours: "",
      positioningPercent: "",
      freeWithinKm: "",
      landingFallback: "",
      handlingFallback: "",
    };
    expect(toOperatorPricingBody(operatorPricingSchema.parse(empty))).toEqual({
      minBillableHours: null,
      positioningRateFactor: null,
      freeWithinKm: null,
      landingFallbackMinor: null,
      handlingFallbackMinor: null,
    });
  });

  it("refuses out-of-range and malformed values", () => {
    expect(
      operatorPricingSchema.safeParse({ ...values, minBillableHours: "20" })
        .success,
    ).toBe(false);
    expect(
      operatorPricingSchema.safeParse({ ...values, landingFallback: "lots" })
        .success,
    ).toBe(false);
    expect(
      operatorPricingSchema.safeParse({ ...values, positioningPercent: "" })
        .success,
    ).toBe(false);
  });

  it("refuses what the API would refuse, so errors stay under the fields", () => {
    const refused = (patch: Partial<typeof values>) =>
      operatorPricingSchema.safeParse({ ...values, ...patch }).success;
    // The factor is kept to two decimals: whole percents only.
    expect(refused({ positioningPercent: "12.5" })).toBe(false);
    expect(refused({ freeWithinKm: "40.5" })).toBe(false);
    expect(refused({ minBillableHours: "1e1" })).toBe(false);
    expect(refused({ minBillableHours: "1.255" })).toBe(false);
    expect(refused({ landingFallback: "10,00,00,001" })).toBe(false);
    expect(refused({ positioningPercent: "75", freeWithinKm: "0" })).toBe(true);
  });

  it("round-trips what the API returns", () => {
    const body = toOperatorPricingBody(operatorPricingSchema.parse(values));
    expect(fromOperatorPricing({ ...body, currency: "INR" })).toEqual({
      ...values,
      landingFallback: "15000",
    });
  });
});
