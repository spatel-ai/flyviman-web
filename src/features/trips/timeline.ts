import type { Schemas } from "@/lib/api/types";

type Event = Schemas["CustomerBookingEventDto"];

export interface TimelineEntry {
  id: string;
  at: string;
  label: string;
  note?: string;
  /** A quoted total, shown with its price type (rule 1). */
  price?: NonNullable<Event["price"]>;
}

const STATUS: Record<string, string> = {
  REQUESTED: "Request sent",
  OPERATOR_PENDING: "Sent to the operator",
  PRICE_CONFIRMED: "Price confirmed",
  AWAITING_PAYMENT: "Ready for payment",
  CONFIRMED: "Trip confirmed",
  SCHEDULED: "Trip scheduled",
  COMPLETED: "Trip completed",
  OPERATOR_UNAVAILABLE: "The operator cannot fly this trip",
  QUOTE_DECLINED: "Quote declined",
  EXPIRED: "Request expired",
  CANCELLED: "Trip cancelled",
};

const CANCELLED_BY: Record<string, string> = {
  YOU: "You cancelled the trip",
  OPERATOR: "The operator cancelled the trip",
  FLYVIMAN: "Flyviman cancelled the trip",
};

const PAYMENT: Record<string, string> = {
  PARTIALLY_PAID: "Deposit received",
  PAID: "Payment received",
  REFUND_PENDING: "Refund started",
  REFUNDED: "Refund completed",
};

function statusLabel(event: Event): string | null {
  const to = event.toStatus;
  if (!to) return null;
  // The question and the answer have entries of their own.
  if (to === "CLARIFICATION_REQUESTED") return null;
  if (
    to === "OPERATOR_PENDING" &&
    event.fromStatus === "CLARIFICATION_REQUESTED"
  ) {
    return null;
  }
  if (to === "CANCELLED" && Object.hasOwn(CANCELLED_BY, event.by)) {
    return CANCELLED_BY[event.by];
  }
  return Object.hasOwn(STATUS, to) ? STATUS[to] : "Status updated";
}

/**
 * The trip's timeline as the API lists it (`GET /bookings/:reference/events`,
 * already oldest first and customer-visible only), in words. A kind the page
 * does not know yet is left out rather than shown wrongly.
 */
export function buildTimeline(events: readonly Event[]): TimelineEntry[] {
  return events.flatMap((event): TimelineEntry[] => {
    const base = { id: event.id, at: event.createdAt };
    switch (event.kind) {
      case "STATUS_CHANGED": {
        const label = statusLabel(event);
        return label ? [{ ...base, label }] : [];
      }
      case "QUOTE_SENT":
        return [
          {
            ...base,
            label: "Quote received",
            ...(event.price ? { price: event.price } : {}),
          },
        ];
      case "PAYMENT_UPDATED": {
        const status = event.paymentStatus ?? "";
        return [
          {
            ...base,
            label: Object.hasOwn(PAYMENT, status)
              ? PAYMENT[status]
              : "Payment updated",
          },
        ];
      }
      case "QUESTION_ASKED":
        return [{ ...base, label: "The operator asked a question" }];
      case "QUESTION_ANSWERED":
        return [{ ...base, label: "You answered the operator" }];
      case "CHANGE_REQUESTED":
        return [
          { ...base, label: "Change requested", note: event.note ?? undefined },
        ];
      case "CHANGE_REQUEST_ANSWERED":
        return [
          {
            ...base,
            label:
              event.decision === "APPROVED"
                ? "Change request approved"
                : "Change request declined",
            note: event.note ?? undefined,
          },
        ];
      case "PASSENGERS_UPDATED":
        // Counts only reach the timeline; no names.
        return [{ ...base, label: "Passengers updated" }];
      default:
        return [];
    }
  });
}
