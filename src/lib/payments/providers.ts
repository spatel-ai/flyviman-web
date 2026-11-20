import { env } from "@/lib/env";
import { RAZORPAY_SCRIPT } from "@/lib/csp";

/**
 * Which checkout opens for an order, from the gateway the API names with it
 * (`checkout.provider`). The site never picks a gateway itself.
 *
 * - `mock`: the test checkout, only where `mockAllowed` (development, or a
 *   build made with NEXT_PUBLIC_MOCK_CHECKOUT=1 for the browser tests). A
 *   deployment never shows it, so a mock order there cannot be paid.
 * - `razorpay`: Razorpay Checkout, whose script is loaded only then.
 * - Anything else: no checkout; the customer is told payment is unavailable.
 */
export type CheckoutKind = "mock" | "razorpay" | null;

export function checkoutKind(
  provider: string,
  mockAllowed: boolean = MOCK_CHECKOUT_ALLOWED,
): CheckoutKind {
  if (provider === "mock") return mockAllowed ? "mock" : null;
  if (provider === "razorpay") return "razorpay";
  return null;
}

export const MOCK_CHECKOUT_ALLOWED =
  process.env.NODE_ENV === "development" ||
  env.NEXT_PUBLIC_MOCK_CHECKOUT === "1";

/** Razorpay Checkout's loader script (allowed by the payment page's CSP). */
export const RAZORPAY_CHECKOUT_JS = `${RAZORPAY_SCRIPT}/v1/checkout.js`;

/** The part of Razorpay Checkout's browser API the site uses. */
export interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: () => void): void;
}

export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler(response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): void;
  modal: { ondismiss(): void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

/** Loads Razorpay Checkout once, on first use. */
export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout needs a browser."));
  }
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Razorpay Checkout could not be loaded."));
    };
    document.head.append(script);
  });
  return loading;
}
