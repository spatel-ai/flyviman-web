import type { ApiErrorDetail } from "@/lib/api/errors";
import type { Schemas } from "@/lib/api/types";

type Booking = Schemas["BookingResponseDto"];

export type PaymentDue =
  | { kind: "full"; amountMinor: number; currency: string }
  | { kind: "deposit"; totalMinor: number; currency: string };

/**
 * What the customer owes now, when the booking awaits payment with a
 * confirmed price and nothing paid. Model A and B owe the full total; model C
 * owes a deposit, whose amount only the API knows (the category's percent,
 * rounded up), so it is looked up before it is shown (`lookUpAmountDue` in
 * `lib/api/payments.ts`). An estimate is never charged (rule 1).
 */
export function paymentDue(booking: Booking): PaymentDue | null {
  if (
    booking.status !== "AWAITING_PAYMENT" ||
    booking.paymentStatus !== "UNPAID" ||
    booking.price?.priceType !== "CONFIRMED"
  ) {
    return null;
  }
  const { amountMinor, currency } = booking.price;
  return booking.paymentModel === "C_DEPOSIT"
    ? { kind: "deposit", totalMinor: amountMinor, currency }
    : { kind: "full", amountMinor, currency };
}

/** The amount the API says is due, as `PAYMENT_AMOUNT_MISMATCH` details carry it. */
export interface AmountDue {
  amountMinor: number;
  currency: string;
  /** `FULL` or `DEPOSIT`; an unknown value from a newer API is kept as sent. */
  purpose: string;
}

/**
 * Reads the amount due from a `PAYMENT_AMOUNT_MISMATCH` refusal. Null when
 * the details are missing or not a positive whole number of paise, so a
 * malformed answer is never shown as a price.
 */
export function amountDueFromDetails(
  details: readonly ApiErrorDetail[],
): AmountDue | null {
  const issue = (field: string) =>
    details.find((detail) => detail.field === field)?.issue;
  const amount = issue("amountMinor");
  const currency = issue("currency");
  const purpose = issue("purpose");
  if (!amount || !/^[1-9]\d{0,15}$/.test(amount) || !currency || !purpose) {
    return null;
  }
  const amountMinor = Number(amount);
  return Number.isSafeInteger(amountMinor)
    ? { amountMinor, currency, purpose }
    : null;
}

/**
 * Whether the booking's payment summary shows the money has arrived: the
 * gateway's verified notice (never the browser) moves it on from `UNPAID`.
 */
export function paymentSettled(paymentStatus: string): boolean {
  return paymentStatus !== "UNPAID";
}
