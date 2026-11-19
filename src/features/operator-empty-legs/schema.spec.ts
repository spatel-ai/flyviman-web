import { describe, expect, it } from "vitest";
import type { EmptyLegOffer } from "@/features/empty-legs/types";
import {
  EMPTY_VALUES,
  emptyLegSchema,
  fromOffer,
  toEmptyLegBody,
  type EmptyLegValues,
} from "./schema";

const GOOD: EmptyLegValues = {
  aircraftId: "a1",
  originId: "o1",
  destinationId: "d1",
  fromDay: "2026-12-01",
  fromTime: "09:30",
  toDay: "2026-12-01",
  toTime: "18:00",
  seatsAvailable: "6",
  price: "2,00,000",
  validDay: "2026-11-30",
  validTime: "12:00",
  conditions: "Subject to operator confirmation and weather.",
};

const issues = (values: Partial<EmptyLegValues>) =>
  emptyLegSchema.safeParse({ ...GOOD, ...values }).error?.issues ?? [];

describe("emptyLegSchema", () => {
  it("accepts a complete offer", () => {
    expect(emptyLegSchema.safeParse(GOOD).success).toBe(true);
  });

  it("asks for every required field", () => {
    expect(emptyLegSchema.safeParse(EMPTY_VALUES).success).toBe(false);
  });

  it("refuses the same airport twice and a window that ends first", () => {
    expect(issues({ destinationId: "o1" })[0].path).toEqual(["destinationId"]);
    expect(issues({ toTime: "08:00" })[0].path).toEqual(["toDay"]);
  });

  it("refuses zero seats, a zero price and short conditions", () => {
    expect(issues({ seatsAvailable: "0" })).toHaveLength(1);
    expect(issues({ price: "0" })).toHaveLength(1);
    expect(issues({ conditions: "ok" })).toHaveLength(1);
  });
});

describe("toEmptyLegBody", () => {
  it("sends paise and UTC instants from the airport's own time", () => {
    const body = toEmptyLegBody(GOOD, "Asia/Kolkata");
    expect(body.price).toEqual({ amountMinor: 20000000, currency: "INR" });
    expect(body.departureFrom).toBe("2026-12-01T04:00:00.000Z");
    expect(body.seatsAvailable).toBe(6);
  });

  it("round-trips through an offer", () => {
    const body = toEmptyLegBody(GOOD, "Asia/Kolkata");
    const offer = {
      id: "x",
      reference: "EL-1",
      aircraft: { id: "a1", type: "T", category: "LIGHT_JET", seats: 8 },
      operatorName: "O",
      origin: { id: "o1", name: "A" },
      destination: { id: "d1", name: "B" },
      departureFrom: body.departureFrom,
      departureTo: body.departureTo,
      seatsAvailable: body.seatsAvailable,
      price: { ...body.price, priceType: "QUOTE" },
      validUntil: body.validUntil,
      conditions: body.conditions,
      status: "DRAFT",
    } as EmptyLegOffer;
    expect(fromOffer(offer, "Asia/Kolkata")).toEqual({
      ...GOOD,
      price: "200000",
    });
  });
});
