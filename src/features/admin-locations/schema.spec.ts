import { describe, expect, it } from "vitest";
import { locationSchema, toCreateBody, toUpdateBody } from "./schema";

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
});
