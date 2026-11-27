import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { OperatorPricingForm } from "./operator-pricing-form";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async () => ({
    data: {
      minBillableHours: 2,
      positioningRateFactor: null,
      freeWithinKm: null,
      landingFallbackMinor: null,
      handlingFallbackMinor: null,
      waitingHourlyMinor: null,
      waitingFreeHours: null,
      overnightMinor: null,
      crewNightMinor: null,
      minBillableHoursPer: "LEG",
      fuelSurchargePerFlightMinor: null,
      permitPerFlightMinor: null,
      navigationPerFlightMinor: null,
      otherChargeMinor: null,
      currency: "INR",
      otherChargeLabel: null,
    },
  })),
}));

function renderForm(suspended: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <OperatorPricingForm suspended={suspended} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function edit() {
  const input = await screen.findByLabelText("Minimum billable hours");
  fireEvent.change(input, { target: { value: "3" } });
  return screen.getByRole("button", { name: "Save pricing" });
}

describe("OperatorPricingForm", () => {
  it("lets a suspended organisation read its pricing but not save, and says why", async () => {
    renderForm(true);
    const save = await edit();
    expect(screen.getByLabelText("Minimum billable hours")).toHaveValue("3");
    expect(save).toBeDisabled();
    expect(save).toHaveAccessibleDescription(
      "Pricing cannot be changed while your organisation is suspended.",
    );
  });

  it("lets an approved organisation save a change", async () => {
    renderForm(false);
    const save = await edit();
    expect(save).toBeEnabled();
    expect(
      screen.queryByText(/cannot be changed while/),
    ).not.toBeInTheDocument();
  });
});
