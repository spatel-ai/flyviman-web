import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import { CancelDialog } from "./cancel-dialog";

// A plain function, not vi.fn: its call log would report a rejected answer as unhandled.
type Handler = (path: string, init?: { body?: unknown }) => Promise<unknown>;
let handler: Handler = async () => ({});
const apiFetch = {
  mockResolvedValue: (value: unknown) => {
    handler = async () => value;
  },
  mockImplementation: (next: Handler) => {
    handler = next;
  },
};
vi.mock("@/lib/api/client", () => ({
  apiFetch: (path: string, init?: { body?: unknown }) => handler(path, init),
}));

const quote = {
  reference: "FLY-BK-1",
  status: "PRICE_CONFIRMED",
  terms: {
    summary: "Free until 72 hours before departure.",
    charges: [{ minHoursBeforeDeparture: 0, chargePercent: 50 }],
  },
  hoursBeforeDeparture: 30,
  appliedCharge: { minHoursBeforeDeparture: 0, chargePercent: 50 },
  priceType: "CONFIRMED",
  totalMinor: 10_000_000,
  currency: "INR",
  amountKnown: true,
  chargeMinor: 5_000_000,
  paidMinor: null,
  refundMinor: null,
  explanation: "Half of the price is charged at this notice.",
};

function open() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>
        <CancelDialog reference="FLY-BK-1" open onOpenChange={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => apiFetch.mockImplementation(async () => ({})));

describe("CancelDialog", () => {
  it("shows a loading state, then the charge and the conditions before the button works", async () => {
    apiFetch.mockResolvedValue({ data: quote });
    open();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByText("Cancellation charge")).toBeInTheDocument();
    expect(screen.getByText(/₹50,000/)).toBeInTheDocument();
    expect(
      screen.getByText("Free until 72 hours before departure."),
    ).toBeInTheDocument();
    // A refund the API cannot read yet is not shown as a figure.
    expect(screen.queryByText("Refund due")).not.toBeInTheDocument();
  });

  it("never shows a zero charge when the amount is not known", async () => {
    apiFetch.mockResolvedValue({
      data: { ...quote, amountKnown: false, chargeMinor: 0, totalMinor: null },
    });
    open();
    expect(await screen.findByText("Not known yet")).toBeInTheDocument();
    expect(screen.queryByText(/₹0/)).not.toBeInTheDocument();
  });

  it("says so when the trip can no longer be cancelled", async () => {
    apiFetch.mockImplementation(async () => {
      throw new ApiError(409, "BOOKING_NOT_CANCELLABLE", "closed");
    });
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "can no longer be cancelled",
    );
    expect(
      screen.queryByRole("button", { name: "Cancel this trip" }),
    ).not.toBeInTheDocument();
  });

  it("confirms with the charge shown, and shows the new figures when it has changed", async () => {
    const user = userEvent.setup();
    let reads = 0;
    apiFetch.mockImplementation(
      async (path: string, init?: { body?: unknown }) => {
        if (path.endsWith("cancellation-quote")) {
          reads += 1;
          return {
            data: reads === 1 ? quote : { ...quote, chargeMinor: 8_000_000 },
          };
        }
        expect(init?.body).toMatchObject({ expectedChargeMinor: 5_000_000 });
        throw new ApiError(409, "BOOKING_CANCELLATION_CHANGED", "changed");
      },
    );
    open();
    await screen.findByText("Cancellation charge");
    await user.click(screen.getByRole("button", { name: "Cancel this trip" }));
    expect(await screen.findByText(/₹80,000/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("charge has changed"),
    );
  });
});
