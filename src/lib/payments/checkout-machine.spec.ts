import { describe, expect, it } from "vitest";
import {
  checkoutReducer,
  INITIAL,
  isPolling,
  type CheckoutEvent,
  type CheckoutState,
} from "./checkout-machine";

function run(...events: CheckoutEvent[]): CheckoutState {
  return events.reduce(checkoutReducer, INITIAL);
}

const ORDERED: CheckoutEvent[] = [
  { type: "PAY" },
  { type: "ORDER_CREATED", paymentReference: "FLY-PY-1" },
];

describe("checkoutReducer", () => {
  it("goes from pay to waiting, and settles only on the booking's payment summary", () => {
    const waiting = run(
      ...ORDERED,
      { type: "CHECKOUT_SUCCEEDED" },
      { type: "VERIFIED" },
    );
    expect(waiting).toEqual({ step: "waiting", paymentReference: "FLY-PY-1" });
    expect(isPolling(waiting)).toBe(true);
    expect(checkoutReducer(waiting, { type: "SETTLED" })).toEqual({
      step: "settled",
    });
  });

  it("never settles from a checkout success alone", () => {
    const verified = run(
      ...ORDERED,
      { type: "CHECKOUT_SUCCEEDED" },
      { type: "VERIFIED" },
    );
    expect(verified.step).not.toBe("settled");
  });

  it("settles when the notice arrives before the verification returns", () => {
    expect(
      run(...ORDERED, { type: "CHECKOUT_SUCCEEDED" }, { type: "SETTLED" }),
    ).toEqual({ step: "settled" });
  });

  it("ignores a settled summary before any order (already paid on load)", () => {
    expect(run({ type: "SETTLED" })).toEqual({ step: "ready" });
    expect(run({ type: "PAY" }, { type: "SETTLED" })).toEqual({
      step: "creating",
    });
  });

  it("fails on a declined checkout, then lets the customer try again", () => {
    const failed = run(...ORDERED, { type: "CHECKOUT_FAILED" });
    expect(failed).toEqual({ step: "failed", reason: "declined" });
    expect(isPolling(failed)).toBe(false);
    expect(checkoutReducer(failed, { type: "RETRY" })).toEqual(INITIAL);
  });

  it("fails on a refused order or verification, keeping the error", () => {
    const error = new Error("no");
    expect(run({ type: "PAY" }, { type: "ORDER_FAILED", error })).toEqual({
      step: "failed",
      reason: "order",
      error,
    });
    expect(
      run(
        ...ORDERED,
        { type: "CHECKOUT_SUCCEEDED" },
        { type: "VERIFY_FAILED", error },
      ),
    ).toEqual({ step: "failed", reason: "verify", error });
    expect(run(...ORDERED, { type: "CHECKOUT_UNAVAILABLE" })).toMatchObject({
      step: "failed",
      reason: "unavailable",
    });
  });

  it("goes back to ready when the checkout is closed", () => {
    expect(run(...ORDERED, { type: "CHECKOUT_DISMISSED" })).toEqual(INITIAL);
  });

  it("stops waiting after the limit, and stays settled whatever arrives late", () => {
    const stalled = run(
      ...ORDERED,
      { type: "CHECKOUT_SUCCEEDED" },
      { type: "VERIFIED" },
      { type: "TIMED_OUT" },
    );
    expect(stalled).toEqual({ step: "stalled" });
    expect(checkoutReducer(stalled, { type: "SETTLED" })).toEqual({
      step: "settled",
    });
    const settled: CheckoutState = { step: "settled" };
    expect(checkoutReducer(settled, { type: "CHECKOUT_FAILED" })).toBe(settled);
    expect(checkoutReducer(settled, { type: "TIMED_OUT" })).toBe(settled);
  });

  it("ignores events that do not belong to the current step", () => {
    expect(run({ type: "VERIFIED" })).toEqual(INITIAL);
    expect(run({ type: "PAY" }, { type: "PAY" })).toEqual({ step: "creating" });
    expect(run(...ORDERED, { type: "TIMED_OUT" })).toEqual({
      step: "checkout",
      paymentReference: "FLY-PY-1",
    });
  });
});
