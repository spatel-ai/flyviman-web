import type { Schemas } from "@/lib/api/types";

type Booking = Schemas["BookingResponseDto"];
type Quote = Schemas["QuoteResponseDto"];
type Message = Schemas["BookingMessageDto"];

export interface TimelineEntry {
  at: string;
  label: string;
  note?: string;
}

/**
 * The customer-visible events of a trip, oldest first. There is no events
 * route yet (`GET /bookings/:reference/events` is planned), so they are
 * worked out from what the booking, its quotes and its messages carry.
 */
export function buildTimeline(
  booking: Booking,
  quotes: readonly Quote[] = [],
  messages: readonly Message[] = [],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { at: booking.createdAt, label: "Request sent" },
  ];
  for (const message of messages) {
    entries.push({
      at: message.createdAt,
      label:
        message.from === "OPERATOR"
          ? "The operator asked a question"
          : "You answered the operator",
    });
  }
  for (const quote of quotes) {
    entries.push({ at: quote.createdAt, label: "Quote received" });
    const closing: Record<string, string> = {
      ACCEPTED: "You accepted the quote",
      REJECTED: "You declined the quote",
      EXPIRED: "A quote expired",
    };
    if (Object.hasOwn(closing, quote.status)) {
      entries.push({ at: quote.updatedAt, label: closing[quote.status] });
    }
  }
  for (const request of booking.changeRequests) {
    const what = request.kind === "CANCELLATION" ? "Cancellation" : "Change";
    entries.push({
      at: request.createdAt,
      label: `${what} requested`,
      note: request.details,
    });
    if (request.decidedAt && request.kind === "CHANGE") {
      entries.push({
        at: request.decidedAt,
        label:
          request.status === "REJECTED"
            ? "Change request declined"
            : "Change request approved",
        note: request.decisionNote ?? undefined,
      });
    }
  }
  if (booking.confirmedAt) {
    entries.push({ at: booking.confirmedAt, label: "Trip confirmed" });
  }
  if (booking.cancelledAt) {
    entries.push({ at: booking.cancelledAt, label: "Trip cancelled" });
  }
  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
