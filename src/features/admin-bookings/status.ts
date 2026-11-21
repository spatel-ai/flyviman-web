import type { Schemas } from "@/lib/api/types";
import type { Role } from "@/lib/api/types";

type Booking = Pick<
  Schemas["AdminBookingSummaryDto"],
  "status" | "paymentStatus"
>;

/**
 * Money has arrived but the booking is still waiting for payment: a payment
 * never confirms an operator-dependent booking by itself (rule 2), so
 * operations must act.
 */
export function isPaidNotConfirmed(booking: Booking): boolean {
  return (
    (booking.paymentStatus === "PAID" ||
      booking.paymentStatus === "PARTIALLY_PAID") &&
    booking.status === "AWAITING_PAYMENT"
  );
}

/** Operations and super administrators act; finance reads. The API decides. */
export function canActOnBookings(role: Role | undefined): boolean {
  return role === "OPS" || role === "SUPER_ADMIN";
}

const EVENTS: Record<string, string> = {
  STATUS_CHANGED: "Status changed",
  OPERATOR_RESPONSE: "Operator answered",
  QUOTE_ISSUED: "Quote sent",
  PAYMENT_UPDATE: "Payment update",
  NOTE: "Internal note added",
  MESSAGE: "Message",
  CHANGE_REQUESTED: "Change requested",
  CANCELLATION_REQUESTED: "Cancellation requested",
  ESCALATED: "Escalated",
  ESCALATION_RESOLVED: "Escalation resolved",
};

/** An unknown event type from a newer API shows as sent. */
export function eventLabel(type: string): string {
  return Object.hasOwn(EVENTS, type) ? EVENTS[type] : type;
}

const REVIEW_REASONS: Record<string, string> = {
  BOOKING_CLOSED: "Paid after the booking closed",
  ALREADY_PAID: "Already paid",
  AMOUNT_MISMATCH: "Amount did not match",
  DUPLICATE_CAPTURE: "Captured twice",
};

export function reviewReasonLabel(reason: string): string {
  return Object.hasOwn(REVIEW_REASONS, reason)
    ? REVIEW_REASONS[reason]
    : reason;
}
