import type { Schemas } from "@/lib/api/types";

type Booking = Schemas["BookingResponseDto"];

/** Statuses the API lists as in progress (requested up to scheduled). */
const IN_PROGRESS: ReadonlySet<string> = new Set([
  "REQUESTED",
  "OPERATOR_PENDING",
  "CLARIFICATION_REQUESTED",
  "PRICE_CONFIRMED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "SCHEDULED",
]);

/** Changes and cancellation are offered only while a trip is in progress. An unknown status offers nothing. */
export function isInProgress(status: string): boolean {
  return IN_PROGRESS.has(status);
}

export type PaymentDue =
  { kind: "full"; amountMinor: number; currency: string } | { kind: "deposit" };

/**
 * What the customer owes now, when the booking awaits payment. A deposit
 * (model C) is worked out at checkout, so no amount is shown for it.
 */
export function paymentDue(booking: Booking): PaymentDue | null {
  if (
    booking.status !== "AWAITING_PAYMENT" ||
    booking.paymentStatus !== "UNPAID" ||
    booking.price?.priceType !== "CONFIRMED"
  ) {
    return null;
  }
  if (booking.paymentModel === "C_DEPOSIT") return { kind: "deposit" };
  return {
    kind: "full",
    amountMinor: booking.price.amountMinor,
    currency: booking.price.currency,
  };
}
