import { apiFetch, type ApiResult } from "./client";
import type { Schemas } from "./types";

/**
 * Every payment call the site makes, in one place (M9, W4-3 and W4-1).
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
// Payment records, receipts, finance and refunds (W4-1).
// ---------------------------------------------------------------------------

/** One payment attempt, as its customer sees it, with its receipt once settled. */
export type BookingPayment = Schemas["BookingPaymentDto"];
export type PaymentReceipt = Schemas["PaymentReceiptDto"];
export type AdminPayment = Schemas["AdminPaymentDto"];
/** A refund finance owes: money taken that has not gone back yet. */
export type RefundDue = Schemas["RefundDueItemDto"];
export type Refund = Schemas["RefundResponseDto"];

export interface PaymentFilter {
  status?: string;
  page: number;
  pageSize: number;
}

/** `GET bookings/:reference/payments`: the customer's payments on a trip. */
export async function listBookingPayments(
  reference: string,
): Promise<BookingPayment[]> {
  return (await apiFetch<BookingPayment[]>(`${booking(reference)}/payments`))
    .data;
}

/** `GET payments/:reference/receipt`: only for a payment that succeeded. */
export async function getReceipt(reference: string): Promise<PaymentReceipt> {
  return (await apiFetch<PaymentReceipt>(`${payment(reference)}/receipt`)).data;
}

/** The site's printable receipt page for a payment. */
export function receiptHref(bookingReference: string, reference: string) {
  return `/account/trips/${encodeURIComponent(bookingReference)}/receipts/${encodeURIComponent(reference)}`;
}

/** `GET admin/payments`, paged, newest first. */
export function listAdminPayments(
  filter: PaymentFilter,
): Promise<ApiResult<AdminPayment[]>> {
  return apiFetch<AdminPayment[]>("admin/payments", {
    query: {
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
    },
  });
}

/** `GET admin/refunds/due`: money owed back, oldest first. */
export function listRefundsDue(
  page: number,
  pageSize: number,
): Promise<ApiResult<RefundDue[]>> {
  return apiFetch<RefundDue[]>("admin/refunds/due", {
    query: { page, pageSize },
  });
}

/** `GET admin/refunds`: refunds started, newest first. */
export function listRefunds(
  page: number,
  pageSize: number,
): Promise<ApiResult<Refund[]>> {
  return apiFetch<Refund[]>("admin/refunds", { query: { page, pageSize } });
}

/**
 * `POST admin/payments/:reference/refunds` with an Idempotency-Key. Money
 * moves, so the reason is required and audited.
 */
export async function startRefund(
  paymentReference: string,
  input: Schemas["CreateRefundDto"],
  key: string,
): Promise<Refund> {
  return (
    await apiFetch<Refund>(`admin/${payment(paymentReference)}/refunds`, {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: input,
    })
  ).data;
}

// ---------------------------------------------------------------------------
// Operator settlements and reconciliation (W4-2, SETTLEMENT_MODE=manual).
// ---------------------------------------------------------------------------

export type AdminSettlement = Schemas["AdminSettlementDto"];
export type OperatorSettlement = Schemas["OperatorSettlementDto"];
export type SettlementChange = Schemas["UpdateSettlementDto"];
export type ReconciliationReport = Schemas["ReconciliationReportDto"];
export type ReconciliationMismatch = Schemas["ReconciliationMismatchDto"];

/** `GET admin/settlements`, paged, newest first. */
export function listSettlements(
  filter: PaymentFilter,
): Promise<ApiResult<AdminSettlement[]>> {
  return apiFetch<AdminSettlement[]>("admin/settlements", {
    query: {
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
    },
  });
}

/**
 * `PATCH admin/settlements/:id` with an Idempotency-Key: hold, release or
 * mark paid (with the payout's bank reference). Audited with the reason.
 */
export async function updateSettlement(
  id: string,
  input: SettlementChange,
  key: string,
): Promise<AdminSettlement> {
  return (
    await apiFetch<AdminSettlement>(
      `admin/settlements/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Idempotency-Key": key },
        body: input,
      },
    )
  ).data;
}

/** `GET admin/reconciliation` for a period (`to` exclusive, at most 92 days). */
export async function getReconciliation(period: {
  from: string;
  to: string;
}): Promise<ReconciliationReport> {
  return (
    await apiFetch<ReconciliationReport>("admin/reconciliation", {
      query: period,
    })
  ).data;
}

/** `GET operator/settlements`: the caller's organisation's own records. */
export function listOperatorSettlements(
  page: number,
  pageSize: number,
): Promise<ApiResult<OperatorSettlement[]>> {
  return apiFetch<OperatorSettlement[]>("operator/settlements", {
    query: { page, pageSize },
  });
}
