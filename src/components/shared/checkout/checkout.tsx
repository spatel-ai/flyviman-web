"use client";

import { useEffect, useRef, useState } from "react";
import { PriceLabel } from "@/components/shared/price-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import {
  deliverMockNotice,
  simulateMockPayment,
  type CheckoutResult,
  type PaymentOrder,
} from "@/lib/api/payments";
import { useMe } from "@/lib/api/use-me";
import {
  checkoutKind,
  loadRazorpay,
  razorpayPrefill,
} from "@/lib/payments/providers";

/** How a checkout ended, whichever gateway ran it. */
export type CheckoutOutcome =
  | { kind: "succeeded"; result: CheckoutResult }
  | { kind: "failed" }
  | { kind: "dismissed" }
  | { kind: "unavailable"; error?: unknown };

export interface CheckoutProps {
  order: PaymentOrder;
  /** Called once, when the checkout ends. */
  onOutcome: (outcome: CheckoutOutcome) => void;
}

/**
 * Opens the gateway's checkout for an order: the provider comes from the
 * API with the order, so another gateway drops in here without the payment
 * page changing. A success only hands back the checkout result; the
 * gateway's verified notice decides whether money arrived.
 */
export function Checkout({ order, onOutcome }: CheckoutProps) {
  const kind = checkoutKind(order.checkout.provider);
  const reported = useRef(false);
  const report = (outcome: CheckoutOutcome) => {
    if (reported.current) return;
    reported.current = true;
    onOutcome(outcome);
  };

  useEffect(() => {
    if (kind === null) report({ kind: "unavailable" });
  });

  if (kind === "mock") return <MockCheckout order={order} onOutcome={report} />;
  if (kind === "razorpay") {
    return <RazorpayCheckout order={order} onOutcome={report} />;
  }
  return null;
}

/**
 * Stands in for the gateway in development and the browser tests: pays or
 * fails the order in the API's mock gateway, then posts the gateway's
 * signed notice to the API as the gateway's servers would. Never in a
 * deployment (`checkoutKind`).
 */
function MockCheckout({ order, onOutcome }: CheckoutProps) {
  const [busy, setBusy] = useState<"success" | "failure" | null>(null);

  async function simulate(outcome: "success" | "failure") {
    setBusy(outcome);
    try {
      const paid = await simulateMockPayment(order.checkout.orderId, outcome);
      if (outcome === "success" && paid.checkout) {
        // The notice travels on its own, as from the gateway's servers.
        void deliverMockNotice(paid.webhook).catch(() => undefined);
        onOutcome({ kind: "succeeded", result: paid.checkout });
      } else {
        await deliverMockNotice(paid.webhook);
        onOutcome({ kind: "failed" });
      }
    } catch (error) {
      onOutcome({ kind: "unavailable", error });
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onOutcome({ kind: "dismissed" });
      }}
    >
      <DialogContent
        title="Test checkout"
        description="No money moves. This stands in for the payment provider in development and tests."
      >
        <PriceLabel
          amountMinor={order.price.amountMinor}
          currency={order.price.currency}
          priceType={order.price.priceType}
        />
        <DialogFooter>
          <Button
            variant="secondary"
            loading={busy === "failure"}
            disabled={busy !== null}
            onClick={() => void simulate("failure")}
          >
            Fail (test)
          </Button>
          <Button
            loading={busy === "success"}
            disabled={busy !== null}
            onClick={() => void simulate("success")}
          >
            Pay (test)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Razorpay Checkout, its script loaded only now. Not enabled yet: the API
 * runs the mock gateway only, and the payment page's CSP allowances
 * (lib/csp.ts) are still to be proven against Razorpay's test mode.
 * Its contact form is filled from the customer's own `GET /me` once that has
 * answered; if it fails, the checkout opens with nothing filled.
 */
function RazorpayCheckout({ order, onOutcome }: CheckoutProps) {
  const me = useMe();
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || me.isPending) return;
    opened.current = true;
    loadRazorpay()
      .then(() => {
        const Razorpay = window.Razorpay;
        if (!Razorpay) throw new Error("Razorpay Checkout is missing.");
        const checkout = new Razorpay({
          key: order.checkout.keyId,
          order_id: order.checkout.orderId,
          amount: order.price.amountMinor,
          currency: order.price.currency,
          name: "Flyviman",
          description: `Booking ${order.bookingReference}`,
          prefill: razorpayPrefill(me.data),
          handler: (response) =>
            onOutcome({
              kind: "succeeded",
              result: {
                providerOrderId: response.razorpay_order_id,
                providerPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
            }),
          modal: { ondismiss: () => onOutcome({ kind: "dismissed" }) },
        });
        checkout.on("payment.failed", () => onOutcome({ kind: "failed" }));
        checkout.open();
      })
      .catch((error: unknown) => onOutcome({ kind: "unavailable", error }));
  });
  return null;
}
