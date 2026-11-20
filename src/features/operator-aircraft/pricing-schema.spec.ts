import { describe, expect, it } from "vitest";
import {
  aircraftPricingSchema,
  fromAircraftPricing,
  toAircraftPricingBody,
} from "./pricing-schema";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const values = {
  hourlyRate: "1,80,000",
  sectorRate: "",
  taxInclusive: true,
  commissionInclusive: false,
  minBillableHours: "2",
  minBillableHoursPer: "DAY",
  routes: [],
};

describe("aircraft pricing form", () => {
  it("sends the hourly figures, with the per-day minimum, in paise", () => {
    expect(
      toAircraftPricingBody(aircraftPricingSchema.parse(values), "HOURLY"),
    ).toEqual({
      hourlyRateMinor: 18_000_000,
      taxInclusive: true,
      commissionInclusive: false,
      minBillableHours: 2,
      minBillableHoursPer: "DAY",
    });
  });

  it("sends only the current model's figures, so the others keep their values", () => {
    const sector = toAircraftPricingBody(
      aircraftPricingSchema.parse({ ...values, sectorRate: "2,50,000" }),
      "SECTOR",
    );
    expect(sector.sectorRateMinor).toBe(25_000_000);
    expect(sector).not.toHaveProperty("fixedRoutes");
    expect(sector).not.toHaveProperty("minBillableHoursPer");

    const routes = toAircraftPricingBody(
      aircraftPricingSchema.parse({
        ...values,
        routes: [{ originId: A, destinationId: B, amount: "250000.50" }],
      }),
      "FIXED_ROUTE",
    );
    expect(routes.fixedRoutes).toEqual([
      { originId: A, destinationId: B, amountMinor: 25_000_050 },
    ]);
    expect(routes).not.toHaveProperty("sectorRateMinor");
  });

  it("sends an empty rate as not set, and no per-day choice without a minimum", () => {
    const body = toAircraftPricingBody(
      aircraftPricingSchema.parse({
        ...values,
        hourlyRate: "",
        minBillableHours: "",
      }),
      "HOURLY",
    );
    expect(body.hourlyRateMinor).toBeNull();
    expect(body.minBillableHours).toBeNull();
    expect(body).not.toHaveProperty("minBillableHoursPer");
  });

  it("refuses what the API would refuse", () => {
    const route = { originId: A, destinationId: B, amount: "100" };
    const refused = (patch: Record<string, unknown>) =>
      !aircraftPricingSchema.safeParse({ ...values, ...patch }).success;
    expect(refused({ hourlyRate: "0.50" })).toBe(true);
    expect(refused({ sectorRate: "lots" })).toBe(true);
    expect(refused({ minBillableHours: "13" })).toBe(true);
    expect(refused({ routes: [{ ...route, destinationId: A }] })).toBe(true);
    expect(refused({ routes: [{ ...route, amount: "" }] })).toBe(true);
    expect(refused({ routes: [{ ...route, originId: "" }] })).toBe(true);
    // Listed once, whichever way it is written.
    expect(
      refused({
        routes: [route, { ...route, originId: B, destinationId: A }],
      }),
    ).toBe(true);
    expect(refused({ routes: [route, { ...route, destinationId: C }] })).toBe(
      false,
    );
    expect(
      refused({
        routes: Array.from({ length: 51 }, (_, index) => ({
          ...route,
          destinationId: `${index}`,
        })),
      }),
    ).toBe(true);
  });

  it("round-trips what the API returns, amounts in rupees", () => {
    expect(
      fromAircraftPricing({
        aircraftId: A,
        currency: "INR",
        hourlyRateMinor: 18_000_000,
        taxInclusive: true,
        commissionInclusive: false,
        minBillableHours: 2,
        minBillableHoursPer: null,
        sectorRateMinor: null,
        fixedRoutes: [
          {
            originId: A,
            destinationId: B,
            amountMinor: 25_000_050,
            originName: "Mumbai",
            destinationName: "Goa",
          },
        ],
      }),
    ).toEqual({
      hourlyRate: "180000",
      sectorRate: "",
      taxInclusive: true,
      commissionInclusive: false,
      minBillableHours: "2",
      minBillableHoursPer: "LEG",
      routes: [{ originId: A, destinationId: B, amount: "250000.5" }],
    });
  });
});
