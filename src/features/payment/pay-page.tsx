"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useReducer, useState } from "react";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import {
  Checkout,
  type CheckoutOutcome,
} from "@/components/shared/checkout/checkout";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { ApiError, isNotFoundError } from "@/lib/api/errors";
import { messageFor, messageForCode } from "@/lib/api/messages";
import {
  createPaymentOrder,
  verifyPayment,
  type PaymentOrder,
} from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { useAttemptKey } from "@/lib/idempotency";
import { amountDueTitle, paymentSettled } from "@/lib/payments/amount-due";
import {
  checkoutReducer,
  INITIAL,
  isPolling,
  POLL_INTERVAL_MS,
  WAIT_LIMIT_MS,
  type CheckoutState,
} from "@/lib/payments/checkout-machine";
import { PayDeadline } from "./pay-deadline";
import { TripSummary } from "./trip-summary";

type Booking = Schemas["BookingResponseDto"];
type Revalidation = Schemas["BookingRevalidationDto"];

/**
 * The recheck before checkout (rule 3) stopped the payment; the message is
 * what the customer reads. Nothing was charged.
 */
class RecheckFailed extends Error {}

/** Above the limit for online payment: retrying cannot help (422). */
const OVER_LIMIT = "PAYMENT_AMOUNT_OVER_LIMIT";

/** Refusals after which what is on screen is out of date. */
const STALE = new Set([
  "PAYMENT_AMOUNT_MISMATCH",
  "PAYMENT_ALREADY_PAID",
  "PAYMENT_NOT_DUE",
]);

/**
 * The payment page (M9): what is due now, the cancellation conditions,
 * then the gateway's checkout. Entered with a full page load, because only
 * this page's Content-Security-Policy allows the gateway (lib/csp.ts).
 */
export function PayPage({ reference }: { reference: string }) {
  const [state, dispatch] = useReducer(checkoutReducer, INITIAL);
  const booking = useQuery({
    queryKey: queryKeys.booking(reference),
    queryFn: async () =>
      (await apiFetch<Booking>(`bookings/${encodeURIComponent(reference)}`))
        .data,
    // Only the gateway's notice moves the payment summary: watch for it.
    refetchInterval: isPolling(state) ? POLL_INTERVAL_MS : false,
  });

  // Where the payment summary stood when the page opened: a balance payer
  // starts at PARTIALLY_PAID, so only a move from here is this payment.
  const paymentStatus = booking.data?.paymentStatus;
  const [startedFrom, setStartedFrom] = useState<string | undefined>();
  if (paymentStatus && startedFrom === undefined) setStartedFrom(paymentStatus);
  useEffect(() => {
    if (
      paymentStatus &&
      startedFrom &&
      paymentSettled(paymentStatus, startedFrom)
    ) {
      dispatch({ type: "SETTLED" });
    }
  }, [paymentStatus, startedFrom]);

  useEffect(() => {
    if (state.step !== "waiting") return;
    const timer = setTimeout(
      () => dispatch({ type: "TIMED_OUT" }),
      WAIT_LIMIT_MS,
    );
    return () => clearTimeout(timer);
  }, [state.step]);

  if (booking.isPending) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (booking.isError) {
    return isNotFoundError(booking.error) ? (
      <RecordNotFound
        title="Trip not found"
        description="This trip does not exist, or it is not one of yours."
        backHref="/account/trips"
        backLabel="Back to your trips"
      />
    ) : (
      <LoadError
        what="this trip"
        error={booking.error}
        onRetry={() => void booking.refetch()}
      />
    );
  }
  return <Loaded booking={booking.data} state={state} dispatch={dispatch} />;
}

function Loaded({
  booking,
  state,
  dispatch,
}: {
  booking: Booking;
  state: CheckoutState;
  dispatch: (event: Parameters<typeof checkoutReducer>[1]) => void;
}) {
  const tripHref = `/account/trips/${encodeURIComponent(booking.reference)}`;
  return (
    <div className="flex max-w-reading flex-col gap-8">
      <div className="flex flex-col gap-3">
        {/* A full page load, so the trip page gets its own, stricter policy. */}
        <a href={tripHref} className="text-body-sm text-accent hover:underline">
          Back to trip {booking.reference}
        </a>
        <h1 className="text-h3 md:text-h2">Pay for your trip</h1>
        {/* Booking status and payment status are never combined. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-muted">
          <span className="flex items-center gap-2">
            Booking <StatusBadge kind="booking" status={booking.status} />
          </span>
          <span className="flex items-center gap-2">
            Payment{" "}
            <StatusBadge kind="payment" status={booking.paymentStatus} />
          </span>
        </div>
      </div>
      <TripSummary booking={booking} />
      <Step
        booking={booking}
        state={state}
        dispatch={dispatch}
        tripHref={tripHref}
      />
    </div>
  );
}

function Step({
  booking,
  state,
  dispatch,
  tripHref,
}: {
  booking: Booking;
  state: CheckoutState;
  dispatch: (event: Parameters<typeof checkoutReducer>[1]) => void;
  tripHref: string;
}) {
  const back = (
    <a href={tripHref} className={buttonClasses({ className: "self-start" })}>
      Back to your trip
    </a>
  );

  if (state.step === "settled") {
    return (
      <Card className="flex flex-col gap-3" role="status">
        <h2 className="text-title">Payment received</h2>
        <p className="text-body-sm text-muted">
          {booking.status === "CONFIRMED"
            ? "The payment provider has confirmed your payment, and your booking is confirmed."
            : "The payment provider has confirmed your payment. Your booking is confirmed separately: its status above changes when it is."}
        </p>
        {back}
      </Card>
    );
  }
  if (state.step === "stalled") {
    return (
      <Card className="flex flex-col gap-3" role="status">
        <h2 className="text-title">Still waiting for the payment provider</h2>
        <p className="text-body-sm text-muted">
          We have not heard back yet. If money left your account it is safe:
          your trip will show the payment as soon as the provider confirms it.
        </p>
        {back}
      </Card>
    );
  }
  if (state.step === "verifying" || state.step === "waiting") {
    return (
      <Card className="flex flex-col gap-3" role="status">
        <h2 className="text-title">Waiting for the payment provider</h2>
        <p className="text-body-sm text-muted">
          Your payment is being confirmed by the provider. This page updates by
          itself; you can also leave it and check your trip later.
        </p>
      </Card>
    );
  }
  return <Due booking={booking} state={state} dispatch={dispatch} />;
}

/** The amount due, the conditions, and the Pay action. */
function Due({
  booking,
  state,
  dispatch,
}: {
  booking: Booking;
  state: CheckoutState;
  dispatch: (event: Parameters<typeof checkoutReducer>[1]) => void;
}) {
  const queryClient = useQueryClient();
  const attempt = useAttemptKey();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  // The API's own rule for what is due now (W4-1); null hides Pay.
  const due = booking.amountDue;
  if (!due) {
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="text-title">Nothing is due now</h2>
        <p className="text-body-sm text-muted">
          This trip has no payment waiting. Its status is shown above.
        </p>
      </Card>
    );
  }

  const amount = { amountMinor: due.amountMinor, currency: due.currency };

  function refresh() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.booking(booking.reference),
    });
  }

  async function pay() {
    dispatch({ type: "PAY" });
    // Rule 3: the trip is checked again before any money moves. Creating
    // the order checks only the amount; availability is checked here.
    try {
      const check = (
        await apiFetch<Revalidation>(
          `bookings/${encodeURIComponent(booking.reference)}/revalidate`,
          { method: "POST" },
        )
      ).data;
      if (!check.available) {
        refresh();
        throw new RecheckFailed(
          "This trip can no longer be flown as booked, so nothing was charged. Your trip page shows what happens next.",
        );
      }
      if (
        check.amountDue?.amountMinor !== amount.amountMinor ||
        check.amountDue.currency !== amount.currency
      ) {
        refresh();
        throw new RecheckFailed(
          "The amount due has changed. The page now shows it: check it and pay again.",
        );
      }
    } catch (error) {
      dispatch({ type: "ORDER_FAILED", error });
      return;
    }
    const key = attempt.keyFor({ reference: booking.reference, ...amount });
    try {
      const created = await createPaymentOrder(booking.reference, amount, key);
      attempt.rotate();
      setOrder(created);
      dispatch({ type: "ORDER_CREATED", paymentReference: created.reference });
    } catch (error) {
      // Only a lost answer keeps the key, so a retry cannot pay twice.
      if (!(error instanceof ApiError && error.status === 0)) attempt.rotate();
      if (error instanceof ApiError && STALE.has(error.code)) {
        refresh();
      }
      dispatch({ type: "ORDER_FAILED", error });
    }
  }

  async function onOutcome(outcome: CheckoutOutcome) {
    const paying = order;
    setOrder(null);
    if (!paying) return;
    switch (outcome.kind) {
      case "dismissed":
        dispatch({ type: "CHECKOUT_DISMISSED" });
        return;
      case "failed":
        dispatch({ type: "CHECKOUT_FAILED" });
        refresh();
        return;
      case "unavailable":
        dispatch({ type: "CHECKOUT_UNAVAILABLE", error: outcome.error });
        return;
      case "succeeded":
        dispatch({ type: "CHECKOUT_SUCCEEDED" });
        try {
          await verifyPayment(paying.reference, outcome.result);
          dispatch({ type: "VERIFIED" });
        } catch (error) {
          dispatch({ type: "VERIFY_FAILED", error });
        }
        refresh();
    }
  }

  const busy = state.step === "creating" || state.step === "checkout";
  // Known before Pay (the API's `overOnlineLimit`) or from the gateway's
  // own refusal: no Pay, no Try again, another way to pay instead.
  const overLimit =
    due.overOnlineLimit ||
    (state.step === "failed" &&
      state.error instanceof ApiError &&
      state.error.code === OVER_LIMIT);

  return (
    <>
      <Card className="flex flex-col gap-3" aria-label="Amount due now">
        <h2 className="text-title">{amountDueTitle(due.kind)}</h2>
        <PriceLabel
          amountMinor={due.amountMinor}
          currency={due.currency}
          priceType={due.priceType}
        />
        {due.kind === "DEPOSIT" && booking.price ? (
          <>
            <p className="text-body-sm text-muted">
              This trip takes a deposit now and the balance later. The trip
              total is:
            </p>
            <PriceLabel
              amountMinor={booking.price.amountMinor}
              currency={booking.price.currency}
              priceType={booking.price.priceType}
            />
          </>
        ) : due.kind === "BALANCE" ? (
          <p className="text-body-sm text-muted">
            The rest of the trip price, after the deposit you have paid.
          </p>
        ) : (
          <p className="text-body-sm text-muted">
            The full price of the trip is paid now.
          </p>
        )}
        <PayDeadline holdExpiresAt={booking.holdExpiresAt} />
      </Card>

      <CancellationTerms
        headingLevel={2}
        summary={booking.cancellationTerms.summary}
        charges={booking.cancellationTerms.charges}
      />

      {overLimit ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert message={messageForCode(OVER_LIMIT)} />
          {/* A full page load: this page's CSP is the payment page's own. */}
          <a
            href="/contact"
            className={buttonClasses({ variant: "secondary" })}
          >
            Contact Flyviman
          </a>
        </div>
      ) : state.step === "failed" ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert message={failureMessage(state)} />
          <Button
            variant="secondary"
            onClick={() => dispatch({ type: "RETRY" })}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <Button size="lg" loading={busy} onClick={() => void pay()}>
            {due.kind === "DEPOSIT"
              ? "Pay deposit"
              : due.kind === "BALANCE"
                ? "Pay balance"
                : "Pay now"}
          </Button>
          {/* Rule 3: `pay()` calls `POST /bookings/:reference/revalidate` first. */}
          <p className="text-caption text-muted">
            When you pay, we check the price and availability again first.
          </p>
          <p className="text-caption text-muted">
            Your booking is confirmed once the payment provider confirms the
            payment, not at the moment you pay.
          </p>
        </div>
      )}

      {order && state.step === "checkout" ? (
        <Checkout
          order={order}
          onOutcome={(outcome) => void onOutcome(outcome)}
        />
      ) : null}
    </>
  );
}

function failureMessage(
  state: Extract<CheckoutState, { step: "failed" }>,
): string {
  switch (state.reason) {
    case "declined":
      return "The payment did not go through, and nothing was charged. You can try again.";
    case "unavailable":
      return "Payment is not available right now. Nothing was charged. Try again later.";
    default:
      return state.error instanceof RecheckFailed
        ? state.error.message
        : messageFor(state.error);
  }
}
