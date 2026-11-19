import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultDetail } from "./result-detail";

const detail = {
  price: { amountMinor: 1_500_000, currency: "INR", priceType: "ESTIMATE" },
  validUntil: "2099-01-01T00:00:00.000Z",
  distanceKm: 500,
  flightMinutes: 90,
  passengerCount: 2,
  legs: [
    {
      originName: "Mumbai",
      destinationName: "Goa",
      departureAt: "2099-01-01T04:30:00.000Z",
    },
  ],
  aircraft: { category: "LIGHT_JET", name: "Jet", operatorName: "Op" },
  breakdown: [
    { code: "FLYING", label: "Flying time, 1.5 hours", amountMinor: 1_000_000 },
    {
      code: "BRAND_NEW_CODE",
      label: "A line the web has not met",
      amountMinor: 500_000,
    },
  ],
  exclusions: [],
  assumptions: [],
  warnings: [],
  confirmationRequirements: [],
  cancellationNote: "Cancellation terms apply.",
};

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async () => ({ data: detail })),
}));
vi.mock("next/image", () => ({
  default: () => <span />,
}));

describe("ResultDetail breakdown", () => {
  it("renders a line with an unknown code by its label", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ResultDetail searchId="s1" resultId="r1" />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Flying time, 1.5 hours")).toBeTruthy();
    expect(screen.getByText("A line the web has not met")).toBeTruthy();
  });
});
