import { describe, expect, it } from "vitest";
import type { Schemas } from "@/lib/api/types";
import { amountDueFromDetails, paymentDue, paymentSettled } from "./amount-due";

type Booking = Schemas["BookingResponseDto"];

const base = {
  reference: "FLY-BK-1",
  status: "AWAITING_PAYMENT",
  paymentStatus: "UNPAID",
  paymentModel: "A_INSTANT",
  price: {
    priceType: "CONFIRMED",
    amountMinor: 5_000_000,
    currency: "INR",
    validUntil: null,
  },
} as unknown as Booking;

describe("paymentDue", () => {
  it("is the confirmed total for models A and B", () => {
    const full = { kind: "full", amountMinor: 5_000_000, currency: "INR" };
    expect(paymentDue(base)).toEqual(full);
    expect(
      paymentDue({ ...base, paymentModel: "B_OPERATOR_CONFIRMED" }),
    ).toEqual(full);
  });

  it("is a deposit of unknown amount, with the total, for model C", () => {
    expect(paymentDue({ ...base, paymentModel: "C_DEPOSIT" })).toEqual({
      kind: "deposit",
      totalMinor: 5_000_000,
      currency: "INR",
    });
  });

  it("is nothing when the price is not confirmed, or payment is not due", () => {
    expect(
      paymentDue({ ...base, price: { ...base.price!, priceType: "ESTIMATE" } }),
    ).toBeNull();
    expect(paymentDue({ ...base, status: "OPERATOR_PENDING" })).toBeNull();
    expect(paymentDue({ ...base, status: "CONFIRMED" })).toBeNull();
    expect(paymentDue({ ...base, paymentStatus: "PAID" })).toBeNull();
    expect(paymentDue({ ...base, paymentStatus: "PARTIALLY_PAID" })).toBeNull();
    expect(paymentDue({ ...base, price: null })).toBeNull();
  });
});

describe("amountDueFromDetails", () => {
  const details = (amount: string) => [
    { field: "amountMinor", issue: amount },
    { field: "currency", issue: "INR" },
    { field: "purpose", issue: "DEPOSIT" },
  ];

  it("reads the amount the API says is due", () => {
    expect(amountDueFromDetails(details("1250001"))).toEqual({
      amountMinor: 1_250_001,
      currency: "INR",
      purpose: "DEPOSIT",
    });
  });

  it("never turns a malformed answer into an amount", () => {
    for (const bad of ["", "0", "-5", "12.5", "1e9", "99999999999999999"]) {
      expect(amountDueFromDetails(details(bad)), bad).toBeNull();
    }
    expect(amountDueFromDetails([])).toBeNull();
    expect(
      amountDueFromDetails([{ field: "amountMinor", issue: "100" }]),
    ).toBeNull();
  });
});

describe("paymentSettled", () => {
  it("is true once the gateway's notice moved the summary on from unpaid", () => {
    expect(paymentSettled("UNPAID")).toBe(false);
    expect(paymentSettled("PARTIALLY_PAID")).toBe(true);
    expect(paymentSettled("PAID")).toBe(true);
  });
});
