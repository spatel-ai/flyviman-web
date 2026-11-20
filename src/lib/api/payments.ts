import {
  amountDueFromDetails,
  type AmountDue,
} from "@/lib/payments/amount-due";
import { apiFetch, apiUrl, type ApiResult } from "./client";
import { ApiError } from "./errors";
import type { Schemas } from "./types";

/**
 * Every payment call the site makes, in one place (M9, W4-3). The routes in
 * the first part exist; the second part (payment records, receipts, finance
 * and refunds) is W4-1's, written ahead of it: see FINANCE_ROUTES_READY.
 */

export type PaymentOrder = Schemas["PaymentResponseDto"];

/** What a gateway's checkout hands the browser after a payment. */
export type CheckoutResult = Schemas["VerifyPaymentDto"];

const booking = (reference: string) =>
  `bookings/${encodeURIComponent(reference)}`;
const payment = (reference: string) =>
  `payments/${encodeURIComponent(reference)}`;

/**
 * Creates (or, while one for the same amount is open, returns) the gateway
 * order for what the booking owes now. `key` is the attempt's
 * Idempotency-Key (`useAttemptKey`). Never changes the booking's status.
 */
export async function createPaymentOrder(
  reference: string,
  due: { amountMinor: number; currency: string },
  key: string,
): Promise<PaymentOrder> {
  return (
    await apiFetch<PaymentOrder>(`${booking(reference)}/payments`, {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: { expectedAmountMinor: due.amountMinor, currency: due.currency },
    })
  ).data;
}

/**
 * An amount that is never due: the gateway's smallest order is one rupee
 * (100 paise), so offering one paisa is always refused, and nothing is
 * created.
 */
const NEVER_DUE_MINOR = 1;

/**
 * The amount due now, for a model C deposit, which only the API can work
 * out. The API states the amount due when it refuses another amount
 * (`PAYMENT_AMOUNT_MISMATCH`); offering one paisa asks without creating an
 * order. Any other refusal is thrown as it came.
 *
 * TODO: replace with the amount due on the booking once the API returns it
 * (asked of the lead in the W4-3 report).
 */
export async function lookUpAmountDue(
  reference: string,
  currency: string,
  key: string,
): Promise<AmountDue> {
  try {
    await createPaymentOrder(
      reference,
      { amountMinor: NEVER_DUE_MINOR, currency },
      key,
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "PAYMENT_AMOUNT_MISMATCH") {
      const due = amountDueFromDetails(error.details);
      if (due) return due;
    }
    throw error;
  }
  // Unreachable unless the API accepted a one-paisa order.
  throw new ApiError(500, "UNKNOWN_ERROR", "Unexpected answer.");
}

/**
 * Reports the checkout result. Not final: it makes the payment `PENDING` at
 * most; only the gateway's verified notice settles it.
 */
export async function verifyPayment(
  paymentReference: string,
  result: CheckoutResult,
): Promise<PaymentOrder> {
  return (
    await apiFetch<PaymentOrder>(`${payment(paymentReference)}/verify`, {
      method: "POST",
      body: result,
    })
  ).data;
}

/** The mock gateway's answer to a simulated checkout (development only). */
export interface SimulatedPayment {
  checkout: CheckoutResult | null;
  webhook: { body: string; headers: Record<string, string> };
}

/**
 * Development and test only: pays or fails an order in the mock gateway
 * (`POST dev/payments/orders/:orderId/simulate`, which the API answers only
 * with ENABLE_DEV_TOOLS). Returns the checkout result and the gateway's
 * signed notice, which the mock does not send by itself.
 */
export async function simulateMockPayment(
  orderId: string,
  outcome: "success" | "failure",
): Promise<SimulatedPayment> {
  return (
    await apiFetch<SimulatedPayment>(
      `dev/payments/orders/${encodeURIComponent(orderId)}/simulate`,
      { method: "POST", body: { outcome } },
    )
  ).data;
}

/**
 * Development and test only: posts the mock gateway's signed notice to the
 * API, as the gateway's servers would, byte for byte.
 */
export async function deliverMockNotice(
  webhook: SimulatedPayment["webhook"],
): Promise<void> {
  await apiFetch("webhooks/payments/mock", {
    method: "POST",
    headers: webhook.headers,
    rawBody: webhook.body,
  });
}

// ---------------------------------------------------------------------------
// W4-1: payment records, receipts, finance and refunds.
//
// TODO(W4-1): these routes and shapes are written ahead of W4-1 and are not
// in the API yet. When it merges: check each path and shape against
// `openapi.json`, replace the interfaces below with `Schemas[...]`, and set
// FINANCE_ROUTES_READY to true. Nothing calls them until then.
// ---------------------------------------------------------------------------

/** Whether W4-1's routes exist. The pages that need them say so until then. */
export const FINANCE_ROUTES_READY = false;

/** One payment attempt, as its customer or finance sees it. */
export interface PaymentRecord {
  reference: string;
  bookingReference: string;
  /** INITIATED to REFUNDED; unknown values are shown as sent. */
  status: string;
  /** FULL, DEPOSIT or BALANCE. */
  purpose: string;
  price: { priceType: "CONFIRMED"; amountMinor: number; currency: string };
  refundedMinor: number;
  paidAt: string | null;
  createdAt: string;
  /** Whether a receipt can be opened (a settled payment). */
  receiptAvailable: boolean;
}

/** A refund finance owes: a cancelled booking's money not yet returned. */
export interface RefundDue {
  bookingReference: string;
  paymentReference: string;
  /** What the cancellation terms say is owed back. */
  amountMinor: number;
  currency: string;
  /** REFUND_DUE, REFUND_PENDING, REFUNDED or FAILED. */
  status: string;
  dueSince: string;
}

export interface PaymentFilter {
  status?: string;
  page: number;
  pageSize: number;
}

/** TODO(W4-1): assumed `GET bookings/:reference/payments`, newest first. */
export async function listBookingPayments(
  reference: string,
): Promise<PaymentRecord[]> {
  return (await apiFetch<PaymentRecord[]>(`${booking(reference)}/payments`))
    .data;
}

/** TODO(W4-1): `GET payments/:reference`. */
export async function getPayment(reference: string): Promise<PaymentRecord> {
  return (await apiFetch<PaymentRecord>(payment(reference))).data;
}

/** TODO(W4-1): assumed `GET payments/:reference/receipt`, opened as a document. */
export function receiptHref(reference: string): string {
  return apiUrl(`${payment(reference)}/receipt`);
}

/** TODO(W4-1): assumed `GET admin/payments`, paged, newest first. */
export function listAdminPayments(
  filter: PaymentFilter,
): Promise<ApiResult<PaymentRecord[]>> {
  return apiFetch<PaymentRecord[]>("admin/payments", {
    query: {
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
    },
  });
}

/** TODO(W4-1): assumed `GET admin/refunds`, the due queue, oldest first. */
export function listRefundsDue(
  page: number,
  pageSize: number,
): Promise<ApiResult<RefundDue[]>> {
  return apiFetch<RefundDue[]>("admin/refunds", { query: { page, pageSize } });
}

/**
 * TODO(W4-1): assumed `POST admin/payments/:reference/refunds` with an
 * Idempotency-Key. Money moves, so the reason is required and audited.
 */
export async function startRefund(
  paymentReference: string,
  input: { amountMinor: number; currency: string; reason: string },
  key: string,
): Promise<void> {
  await apiFetch(`admin/${payment(paymentReference)}/refunds`, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: input,
  });
}
