import { describe, expect, it } from "vitest";
import type { Schemas } from "@/lib/api/types";
import { describeDefaults, describeRate } from "./operator-pricing";

type AircraftRate = Schemas["AdminAircraftPricingDto"];

const AIRCRAFT: AircraftRate = {
  aircraftId: "a",
  registration: "VT-ABC",
  manufacturer: "Embraer",
  model: "Phenom 300",
  pricingModel: "HOURLY",
  hourlyRateMinor: 18_000_000,
  taxInclusive: false,
  commissionInclusive: false,
  minBillableHours: null,
  minBillableHoursPer: null,
  sectorRateMinor: null,
  fixedRoutes: [],
  currency: "INR",
};

describe("describeRate", () => {
  it("names the rate the pricing model uses, or price on request", () => {
    expect(describeRate(AIRCRAFT)).toMatch(/1,80,000 per hour$/);
    expect(describeRate({ ...AIRCRAFT, hourlyRateMinor: null })).toBe(
      "No hourly rate: price on request",
    );
    expect(
      describeRate({
        ...AIRCRAFT,
        pricingModel: "SECTOR",
        sectorRateMinor: 5_000_000,
      }),
    ).toMatch(/50,000 per sector$/);
    expect(
      describeRate({
        ...AIRCRAFT,
        pricingModel: "FIXED_ROUTE",
        fixedRoutes: [
          {
            originId: "o",
            destinationId: "d",
            amountMinor: 9_000_000,
            originName: "Mumbai",
            destinationName: "Goa",
          },
        ],
      }),
    ).toMatch(/^1 route, from .*90,000$/);
  });
});

describe("describeDefaults", () => {
  it("lists every default, saying when one is not set", () => {
    const items = describeDefaults({
      minBillableHours: 2,
      minBillableHoursPer: "DAY",
      positioningRateFactor: 0.8,
      freeWithinKm: 50,
      landingFallbackMinor: null,
      handlingFallbackMinor: 500_000,
      waitingHourlyMinor: null,
      waitingFreeHours: null,
      overnightMinor: null,
      crewNightMinor: null,
      fuelSurchargePerFlightMinor: null,
      permitPerFlightMinor: null,
      navigationPerFlightMinor: null,
      otherChargeMinor: 100_000,
      otherChargeLabel: "De-icing",
      currency: "INR",
    });
    const byLabel = Object.fromEntries(items.map((i) => [i.label, i.value]));
    expect(byLabel["Minimum billable hours"]).toBe("2 h per day");
    expect(byLabel.Positioning).toBe(
      "80% of the hourly rate, free within 50 km",
    );
    expect(byLabel["Landing (fallback)"]).toBe("Not set");
    expect(byLabel["De-icing"]).toMatch(/1,000$/);
  });
});
