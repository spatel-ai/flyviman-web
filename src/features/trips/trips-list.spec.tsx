import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TripsList } from "./trips-list";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async () => ({
    data: [
      {
        reference: "FLY-BK-1",
        status: "OPERATOR_PENDING",
        paymentStatus: "UNPAID",
        price: null,
        tripType: "ONE_WAY",
        originName: "Mumbai",
        destinationName: "Goa",
        departureAt: "2099-01-01T04:30:00.000Z",
        passengerCount: 2,
      },
    ],
    meta: { total: 1 },
  })),
}));

describe("TripsList", () => {
  it("shows the booking status and the payment status as two badges, and a request as price on request", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TripsList />
      </QueryClientProvider>,
    );
    const row = await screen.findByRole("link", { name: /Mumbai to Goa/ });
    expect(within(row).getByText("Awaiting operator")).toBeInTheDocument();
    expect(within(row).getByText("Unpaid")).toBeInTheDocument();
    expect(within(row).getByText("Price on request")).toBeInTheDocument();
  });
});
