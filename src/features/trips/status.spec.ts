import { describe, expect, it } from "vitest";
import type { Schemas } from "@/lib/api/types";
import { isInProgress } from "./status";
import { buildTimeline } from "./timeline";

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
  changeRequests: [],
  confirmedAt: null,
  cancelledAt: null,
  createdAt: "2099-01-01T00:00:00.000Z",
} as unknown as Booking;

describe("isInProgress", () => {
  it("offers actions for in-progress statuses only, and for no unknown one", () => {
    expect(isInProgress("OPERATOR_PENDING")).toBe(true);
    expect(isInProgress("SCHEDULED")).toBe(true);
    expect(isInProgress("CANCELLED")).toBe(false);
    expect(isInProgress("COMPLETED")).toBe(false);
    expect(isInProgress("SOMETHING_NEW")).toBe(false);
  });
});

describe("buildTimeline", () => {
  it("orders what the booking, quotes and messages carry, oldest first", () => {
    const entries = buildTimeline(
      {
        ...base,
        confirmedAt: "2099-01-05T00:00:00.000Z",
        changeRequests: [
          {
            kind: "CHANGE",
            status: "REJECTED",
            details: "Later please",
            decisionNote: "Not possible",
            decidedAt: "2099-01-04T00:00:00.000Z",
            createdAt: "2099-01-03T00:00:00.000Z",
          },
        ],
      } as unknown as Booking,
      [
        {
          status: "ACCEPTED",
          createdAt: "2099-01-02T00:00:00.000Z",
          updatedAt: "2099-01-02T06:00:00.000Z",
        },
      ] as never,
      [{ from: "OPERATOR", createdAt: "2099-01-01T12:00:00.000Z" }] as never,
    );
    expect(entries.map((e) => e.label)).toEqual([
      "Request sent",
      "The operator asked a question",
      "Quote received",
      "You accepted the quote",
      "Change requested",
      "Change request declined",
      "Trip confirmed",
    ]);
  });
});
