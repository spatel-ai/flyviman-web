import { describe, expect, it } from "vitest";
import {
  locationSchema,
  paiseToRupees,
  rupeesToPaise,
  toCreateBody,
  toUpdateBody,
} from "./schema";

const base = {
  type: "LANDING_SITE" as const,
  name: "Kedarnath Helipad",
  iata: "",
  icao: "",
  city: "Kedarnath",
  state: "Uttarakhand",
  country: "in",
  latitude: 30.7346,
  longitude: 79.0669,
  timeZone: "Asia/Kolkata",
  runwayLengthM: "" as const,
  nightOperations: "no" as const,
  helicopterApproved: true,
  isActive: true,
  hasCharges: true,
  chargeCategory: "HELICOPTER" as const,
  landingRupees: "5000",
  parkingRupees: "1000",
  handlingRupees: "2500.50",
};

describe("locationSchema", () => {
  it("uppercases codes and converts rupees to paise", () => {
    const values = locationSchema.parse(base);
    expect(toCreateBody(values)).toMatchObject({
      country: "IN",
      iata: null,
      icao: null,
      capabilities: {
        runwayLengthM: null,
        nightOperations: false,
        helicopterApproved: true,
      },
      charges: {
        currency: "INR",
        categories: [
          {
            category: "HELICOPTER",
            landingMinor: 500_000,
            parkingMinor: 100_000,
            handlingMinor: 250_050,
          },
        ],
      },
    });
    expect(toUpdateBody(values).isActive).toBe(true);
  });

  it("refuses a bad IATA and clears charges when turned off", () => {
    expect(locationSchema.safeParse({ ...base, iata: "BO" }).success).toBe(
      false,
    );
    const values = locationSchema.parse({ ...base, hasCharges: false });
    expect(toCreateBody(values).charges).toBeNull();
  });

  it("converts rupees to paise from the text, without floating point", () => {
    expect(rupeesToPaise("0.29")).toBe(29);
    expect(rupeesToPaise("1.1")).toBe(110);
    expect(rupeesToPaise("2500.50")).toBe(250_050);
    expect(rupeesToPaise(" ")).toBeNull();
    expect(rupeesToPaise("1.234")).toBeUndefined();
    expect(rupeesToPaise("-5")).toBeUndefined();
    expect(paiseToRupees(250_050)).toBe("2500.50");
    expect(paiseToRupees(500_000)).toBe("5000");
    expect(paiseToRupees(29)).toBe("0.29");
  });

  it("writes no row for a category whose amounts are blank", () => {
    const helicopter = {
      category: "HELICOPTER" as const,
      landingMinor: 500_000,
      parkingMinor: 0,
      handlingMinor: 0,
    };
    const values = locationSchema.parse({
      ...base,
      chargeCategory: "LIGHT_JET",
      landingRupees: "",
      parkingRupees: "",
      handlingRupees: "",
    });
    expect(toUpdateBody(values, [helicopter]).charges).toEqual({
      currency: "INR",
      categories: [helicopter],
    });
    expect(toUpdateBody(values, []).charges).toBeNull();
  });

  it("keeps the other categories and replaces only the one on screen", () => {
    const values = locationSchema.parse({
      ...base,
      chargeCategory: "LIGHT_JET",
      landingRupees: "40000",
      parkingRupees: "",
      handlingRupees: "",
    });
    const body = toUpdateBody(values, [
      {
        category: "HELICOPTER",
        landingMinor: 500_000,
        parkingMinor: 0,
        handlingMinor: 0,
      },
      {
        category: "LIGHT_JET",
        landingMinor: 1,
        parkingMinor: 1,
        handlingMinor: 1,
      },
    ]);
    expect(body.charges).toEqual({
      currency: "INR",
      categories: [
        {
          category: "LIGHT_JET",
          landingMinor: 4_000_000,
          parkingMinor: 0,
          handlingMinor: 0,
        },
        {
          category: "HELICOPTER",
          landingMinor: 500_000,
          parkingMinor: 0,
          handlingMinor: 0,
        },
      ],
    });
  });
});
