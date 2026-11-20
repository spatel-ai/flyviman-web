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
import { messageFor } from "@/lib/api/messages";
import {
  createPaymentOrder,
  lookUpAmountDue,
  verifyPayment,
  type PaymentOrder,
} from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { newKey, useAttemptKey } from "@/lib/idempotency";
import { paymentDue, paymentSettled } from "@/lib/payments/amount-due";
import {
  checkoutReducer,
  INITIAL,
  isPolling,
  POLL_INTERVAL_MS,
  WAIT_LIMIT_MS,
  type CheckoutState,
} from "@/lib/payments/checkout-machine";

type Booking = Schemas["BookingResponseDto"];

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

  const paymentStatus = booking.data?.paymentStatus;
  useEffect(() => {
    if (paymentStatus && paymentSettled(paymentStatus)) {
      dispatch({ type: "SETTLED" });
    }
  }, [paymentStatus]);

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
  const due = paymentDue(booking);
  const deposit = useQuery({
    queryKey: queryKeys.paymentAmountDue(booking.reference),
    queryFn: () =>
      lookUpAmountDue(
        booking.reference,
        booking.price?.currency ?? "INR",
        newKey(),
      ),
    enabled: due?.kind === "deposit",
    // Never kept: the amount due is read again each time it is shown.
    gcTime: 0,
    retry: false,
  });

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

  const amount =
    due.kind === "full"
      ? { amountMinor: due.amountMinor, currency: due.currency }
      : deposit.data
        ? {
            amountMinor: deposit.data.amountMinor,
            currency: deposit.data.currency,
          }
        : null;

  function refresh() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.booking(booking.reference),
    });
  }

  async function pay() {
    if (!amount) return;
    dispatch({ type: "PAY" });
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
        void deposit.refetch();
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

  return (
    <>
      <Card className="flex flex-col gap-3" aria-label="Amount due now">
        <h2 className="text-title">
          {due.kind === "deposit" ? "Deposit due now" : "Amount due now"}
        </h2>
        {amount ? (
          <PriceLabel
            amountMinor={amount.amountMinor}
            currency={amount.currency}
            priceType="CONFIRMED"
          />
        ) : deposit.isError ? (
          <LoadError
            what="the deposit due"
            error={deposit.error}
            onRetry={() => void deposit.refetch()}
          />
        ) : (
          <Skeleton className="h-12 w-48" />
        )}
        {due.kind === "deposit" ? (
          <>
            <p className="text-body-sm text-muted">
              This trip takes a deposit now and the balance later. The trip
              total is:
            </p>
            <PriceLabel
              amountMinor={due.totalMinor}
              currency={due.currency}
              priceType="CONFIRMED"
            />
          </>
        ) : (
          <p className="text-body-sm text-muted">
            The full price of the trip is paid now.
          </p>
        )}
      </Card>

      <CancellationTerms
        summary={booking.cancellationTerms.summary}
        charges={booking.cancellationTerms.charges}
      />

      {state.step === "failed" ? (
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
          <Button
            size="lg"
            loading={busy}
            disabled={!amount}
            onClick={() => void pay()}
          >
            {due.kind === "deposit" ? "Pay deposit" : "Pay now"}
          </Button>
          <p className="text-caption text-muted">
            Your booking is confirmed once the payment provider confirms the
            payment, not when this window closes.
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
      return messageFor(state.error);
  }
}
