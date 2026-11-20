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
  waitingHourly: "20,000",
  waitingFreeHours: "1",
  overnight: "50000",
  crewNight: "0",
  minBillableHoursPer: "LEG",
  fuelSurcharge: "",
  permit: "",
  navigation: "",
  otherCharge: "",
  otherChargeLabel: "",
};

describe("operator pricing form", () => {
  it("sends percentages as factors and rupees as paise", () => {
    expect(toOperatorPricingBody(operatorPricingSchema.parse(values))).toEqual({
      minBillableHours: 1.5,
      positioningRateFactor: 0.8,
      freeWithinKm: 50,
      landingFallbackMinor: 1_500_000,
      handlingFallbackMinor: 500_000,
      waitingHourlyMinor: 2_000_000,
      waitingFreeHours: 1,
      overnightMinor: 5_000_000,
      crewNightMinor: 0,
      minBillableHoursPer: "LEG",
      fuelSurchargePerFlightMinor: null,
      permitPerFlightMinor: null,
      navigationPerFlightMinor: null,
      otherChargeMinor: null,
    });
  });

  it("sends the 4c charges in paise, the label with its charge, the per-day minimum", () => {
    const body = toOperatorPricingBody(
      operatorPricingSchema.parse({
        ...values,
        minBillableHoursPer: "DAY",
        fuelSurcharge: "5,000",
        permit: "2000.50",
        navigation: "1000",
        otherCharge: "3000",
        otherChargeLabel: "  Catering ",
      }),
    );
    expect(body).toMatchObject({
      minBillableHoursPer: "DAY",
      fuelSurchargePerFlightMinor: 500_000,
      permitPerFlightMinor: 200_050,
      navigationPerFlightMinor: 100_000,
      otherChargeMinor: 300_000,
      otherChargeLabel: "Catering",
    });
  });

  it("clears the other charge without sending a label, and omits the per-day choice with no minimum", () => {
    const body = toOperatorPricingBody(
      operatorPricingSchema.parse({
        ...values,
        minBillableHours: "",
        minBillableHoursPer: "DAY",
        otherChargeLabel: "Left over",
      }),
    );
    expect(body.otherChargeMinor).toBeNull();
    expect(body).not.toHaveProperty("otherChargeLabel");
    expect(body).not.toHaveProperty("minBillableHoursPer");
  });

  it("needs a name for an other charge, and refuses bad charges", () => {
    const refused = (patch: Record<string, string>) =>
      operatorPricingSchema.safeParse({ ...values, ...patch }).success;
    expect(refused({ otherCharge: "3000" })).toBe(false);
    expect(refused({ otherCharge: "3000", otherChargeLabel: "A" })).toBe(false);
    expect(refused({ otherCharge: "3000", otherChargeLabel: "Catering" })).toBe(
      true,
    );
    expect(refused({ fuelSurcharge: "lots" })).toBe(false);
    expect(refused({ permit: "10,00,00,001" })).toBe(false);
    expect(refused({ minBillableHoursPer: "WEEK" })).toBe(false);
  });

  it("sends empty fields as not set", () => {
    const empty = {
      minBillableHours: "",
      positioningPercent: "",
      freeWithinKm: "",
      landingFallback: "",
      handlingFallback: "",
      waitingHourly: "",
      waitingFreeHours: "",
      overnight: "",
      crewNight: "",
      minBillableHoursPer: "LEG",
      fuelSurcharge: "",
      permit: "",
      navigation: "",
      otherCharge: "",
      otherChargeLabel: "",
    };
    expect(toOperatorPricingBody(operatorPricingSchema.parse(empty))).toEqual({
      minBillableHours: null,
      positioningRateFactor: null,
      freeWithinKm: null,
      landingFallbackMinor: null,
      handlingFallbackMinor: null,
      waitingHourlyMinor: null,
      waitingFreeHours: null,
      overnightMinor: null,
      crewNightMinor: null,
      fuelSurchargePerFlightMinor: null,
      permitPerFlightMinor: null,
      navigationPerFlightMinor: null,
      otherChargeMinor: null,
    });
  });

  it("refuses free waiting hours above a day", () => {
    expect(
      operatorPricingSchema.safeParse({ ...values, waitingFreeHours: "25" })
        .success,
    ).toBe(false);
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
    expect(
      fromOperatorPricing({
        waitingHourlyMinor: null,
        waitingFreeHours: null,
        overnightMinor: null,
        crewNightMinor: null,
        minBillableHoursPer: null,
        fuelSurchargePerFlightMinor: null,
        permitPerFlightMinor: null,
        navigationPerFlightMinor: null,
        otherChargeMinor: null,
        otherChargeLabel: null,
        ...body,
        currency: "INR",
      }),
    ).toEqual({
      ...values,
      landingFallback: "15000",
      waitingHourly: "20000",
      overnight: "50000",
      crewNight: "0",
    });
  });
});
