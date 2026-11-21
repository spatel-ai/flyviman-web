import { describe, expect, it } from "vitest";
import type { Schemas } from "@/lib/api/types";
import { isInProgress } from "./status";
import { buildTimeline } from "./timeline";

type Event = Schemas["CustomerBookingEventDto"];

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
  const event = (fields: Partial<Event>): Event => ({
    id: "e",
    kind: "STATUS_CHANGED",
    by: "SYSTEM",
    fromStatus: null,
    toStatus: null,
    price: null,
    quoteReference: null,
    paymentStatus: null,
    changeRequestId: null,
    decision: null,
    note: null,
    createdAt: "2099-01-01T00:00:00.000Z",
    ...fields,
  });

  it("words the API's events in order and leaves out what it does not know", () => {
    const entries = buildTimeline([
      event({ id: "1", by: "YOU", toStatus: "REQUESTED" }),
      event({
        id: "2",
        fromStatus: "OPERATOR_PENDING",
        toStatus: "CLARIFICATION_REQUESTED",
        by: "OPERATOR",
      }),
      event({ id: "3", kind: "QUESTION_ASKED", by: "OPERATOR" }),
      event({
        id: "4",
        kind: "QUOTE_SENT",
        by: "OPERATOR",
        quoteReference: "FLY-QT-1",
        price: {
          priceType: "QUOTE",
          amountMinor: 5_000_000,
          currency: "INR",
          validUntil: null,
        },
      }),
      event({
        id: "5",
        kind: "CHANGE_REQUEST_ANSWERED",
        by: "OPERATOR",
        decision: "REJECTED",
        note: "Not possible",
      }),
      event({ id: "6", kind: "PAYMENT_UPDATED", paymentStatus: "PAID" }),
      event({ id: "7", by: "YOU", toStatus: "CANCELLED" }),
      event({ id: "8", kind: "SOMETHING_NEW" as Event["kind"] }),
    ]);
    expect(entries.map((e) => e.label)).toEqual([
      "Request sent",
      "The operator asked a question",
      "Quote received",
      "Change request declined",
      "Payment received",
      "You cancelled the trip",
    ]);
    expect(entries[2].price?.priceType).toBe("QUOTE");
    expect(entries[3].note).toBe("Not possible");
  });
});
