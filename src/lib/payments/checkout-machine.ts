/**
 * The steps of one payment, as a pure reducer so every move is unit tested.
 *
 *   ready ─PAY→ creating ─ORDER_CREATED→ checkout ─SUCCEEDED→ verifying
 *     ─VERIFIED→ waiting ─SETTLED→ settled
 *
 * The browser never decides that money arrived: `waiting` ends only when the
 * booking's payment summary changes, which the gateway's verified notice
 * does (`SETTLED`), or after a while (`TIMED_OUT`, "still processing").
 * A failure reported by the checkout, a refused order or a refused
 * verification ends in `failed` (retry possible); closing the checkout goes
 * back to `ready`.
 */

export type CheckoutState =
  | { step: "ready" }
  | { step: "creating" }
  | { step: "checkout"; paymentReference: string }
  | { step: "verifying"; paymentReference: string }
  | { step: "waiting"; paymentReference: string }
  | { step: "settled" }
  | { step: "stalled" }
  | { step: "failed"; reason: FailureReason; error?: unknown };

/** Why a payment attempt ended: the order, the gateway or the verification. */
export type FailureReason = "order" | "declined" | "verify" | "unavailable";

export type CheckoutEvent =
  | { type: "PAY" }
  | { type: "ORDER_CREATED"; paymentReference: string }
  | { type: "ORDER_FAILED"; error: unknown }
  | { type: "CHECKOUT_SUCCEEDED" }
  | { type: "CHECKOUT_FAILED" }
  | { type: "CHECKOUT_DISMISSED" }
  | { type: "CHECKOUT_UNAVAILABLE"; error?: unknown }
  | { type: "VERIFIED" }
  | { type: "VERIFY_FAILED"; error: unknown }
  | { type: "SETTLED" }
  | { type: "TIMED_OUT" }
  | { type: "RETRY" };

export const INITIAL: CheckoutState = { step: "ready" };

export function checkoutReducer(
  state: CheckoutState,
  event: CheckoutEvent,
): CheckoutState {
  // A settled payment stays settled whatever arrives late.
  if (state.step === "settled") return state;
  // The notice can arrive at any point after the order: the booking's
  // payment summary is the truth, whatever the browser is doing.
  if (event.type === "SETTLED") {
    return state.step === "ready" || state.step === "creating"
      ? state
      : { step: "settled" };
  }
  switch (state.step) {
    case "ready":
      return event.type === "PAY" ? { step: "creating" } : state;
    case "creating":
      if (event.type === "ORDER_CREATED") {
        return { step: "checkout", paymentReference: event.paymentReference };
      }
      if (event.type === "ORDER_FAILED") {
        return { step: "failed", reason: "order", error: event.error };
      }
      return state;
    case "checkout":
      switch (event.type) {
        case "CHECKOUT_SUCCEEDED":
          return {
            step: "verifying",
            paymentReference: state.paymentReference,
          };
        case "CHECKOUT_FAILED":
          return { step: "failed", reason: "declined" };
        case "CHECKOUT_DISMISSED":
          return { step: "ready" };
        case "CHECKOUT_UNAVAILABLE":
          return { step: "failed", reason: "unavailable", error: event.error };
        default:
          return state;
      }
    case "verifying":
      if (event.type === "VERIFIED") {
        return { step: "waiting", paymentReference: state.paymentReference };
      }
      if (event.type === "VERIFY_FAILED") {
        return { step: "failed", reason: "verify", error: event.error };
      }
      return state;
    case "waiting":
      return event.type === "TIMED_OUT" ? { step: "stalled" } : state;
    case "failed":
      return event.type === "RETRY" ? { step: "ready" } : state;
    case "stalled":
      return state;
  }
}

/** Whether the booking should be polled for the gateway's notice. */
export function isPolling(state: CheckoutState): boolean {
  return state.step === "verifying" || state.step === "waiting";
}

/** How often the booking is read while waiting, and for how long. */
export const POLL_INTERVAL_MS = 2_000;
export const WAIT_LIMIT_MS = 120_000;
