import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentOrder } from "@/lib/api/payments";
import { Checkout, type CheckoutOutcome } from "./checkout";

// The test checkout is allowed, as in a build for the browser tests.
vi.mock("@/lib/env", async (actual) => {
  const real = await actual<typeof import("@/lib/env")>();
  return { ...real, env: { ...real.env, NEXT_PUBLIC_MOCK_CHECKOUT: "1" } };
});

type Call = { path: string; init?: { body?: unknown; rawBody?: string } };
let calls: Call[] = [];
vi.mock("@/lib/api/client", () => ({
  apiFetch: async (path: string, init?: Call["init"]) => {
    calls.push({ path, init });
    if (path.endsWith("/simulate")) {
      const success = (init?.body as { outcome: string }).outcome === "success";
      return {
        data: {
          checkout: success
            ? {
                providerOrderId: "order_1",
                providerPaymentId: "pay_1",
                signature: "abc",
              }
            : null,
          webhook: { body: '{"event":"x"}', headers: { "x-sig": "1" } },
        },
      };
    }
    return { data: {} };
  },
  apiUrl: (path: string) => path,
}));

function order(provider: string): PaymentOrder {
  return {
    reference: "FLY-PY-1",
    bookingReference: "FLY-BK-1",
    status: "INITIATED",
    purpose: "FULL",
    price: { priceType: "CONFIRMED", amountMinor: 5_000_000, currency: "INR" },
    checkout: { provider, keyId: "rzp_mock_key", orderId: "order_1" },
    paidAt: null,
    createdAt: "2099-01-01T00:00:00.000Z",
  };
}

function open(provider: string) {
  const outcomes: CheckoutOutcome[] = [];
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Checkout order={order(provider)} onOutcome={(o) => outcomes.push(o)} />
    </QueryClientProvider>,
  );
  return outcomes;
}

const razorpayScripts = () =>
  document.querySelectorAll('script[src*="checkout.razorpay.com"]');

beforeEach(() => {
  calls = [];
});

describe("Checkout", () => {
  it("with the mock, pays the order and posts the gateway's notice byte for byte", async () => {
    const outcomes = open("mock");
    expect(screen.getByText("Confirmed price")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Pay (test)" }));
    await waitFor(() =>
      expect(outcomes).toEqual([
        {
          kind: "succeeded",
          result: {
            providerOrderId: "order_1",
            providerPaymentId: "pay_1",
            signature: "abc",
          },
        },
      ]),
    );
    expect(calls.map((call) => call.path)).toEqual([
      "dev/payments/orders/order_1/simulate",
      "webhooks/payments/mock",
    ]);
    expect(calls[1].init?.rawBody).toBe('{"event":"x"}');
    expect(razorpayScripts()).toHaveLength(0);
  });

  it("with the mock, reports a failure after the failure notice is delivered", async () => {
    const outcomes = open("mock");
    await userEvent.click(screen.getByRole("button", { name: "Fail (test)" }));
    await waitFor(() => expect(outcomes).toEqual([{ kind: "failed" }]));
    expect(calls.map((call) => call.path)).toContain("webhooks/payments/mock");
  });

  it("closing the test checkout is a dismissal, not a failure", async () => {
    const outcomes = open("mock");
    await userEvent.keyboard("{Escape}");
    expect(outcomes).toEqual([{ kind: "dismissed" }]);
  });

  it("reports an unknown gateway as unavailable, without loading anything", async () => {
    const outcomes = open("unknown");
    await waitFor(() => expect(outcomes).toEqual([{ kind: "unavailable" }]));
    expect(calls).toEqual([]);
    expect(razorpayScripts()).toHaveLength(0);
  });

  it("loads Razorpay's script only for Razorpay, once the customer's own details are read", async () => {
    open("razorpay");
    await waitFor(() => expect(razorpayScripts()).toHaveLength(1));
    expect(calls.map((call) => call.path)).toEqual(["me"]);
  });
});
