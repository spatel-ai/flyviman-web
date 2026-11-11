import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceLabel, type PriceType } from "./price-label";

describe("PriceLabel", () => {
  it.each<[PriceType, string]>([
    ["ESTIMATE", "Estimate"],
    ["LIVE_FARE", "Live fare"],
    ["QUOTE", "Quote"],
    ["CONFIRMED", "Confirmed price"],
  ])("labels a %s price as %s", (priceType, label) => {
    render(
      <PriceLabel
        amountMinor={52179600}
        currency="INR"
        priceType={priceType}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("₹5,21,796")).toBeInTheDocument();
  });

  it("tells the customer an estimate is not final", () => {
    render(
      <PriceLabel amountMinor={52179600} currency="INR" priceType="ESTIMATE" />,
    );

    expect(
      screen.getByText("Final price confirmed by the operator"),
    ).toBeInTheDocument();
  });

  it("shows validity in the local zone", () => {
    render(
      <PriceLabel
        amountMinor={52179600}
        currency="INR"
        priceType="QUOTE"
        validUntil="2026-11-12T10:00:00Z"
      />,
    );

    expect(
      screen.getByText(/Valid until 12 Nov 2026, 3:30 pm IST/),
    ).toBeInTheDocument();
  });

  it("strikes through an expired price and asks for a refresh", () => {
    render(
      <PriceLabel
        amountMinor={52179600}
        currency="INR"
        priceType="ESTIMATE"
        expired
      />,
    );

    expect(screen.getByText("₹5,21,796")).toHaveClass("line-through");
    expect(screen.getByText(/This price has expired/)).toBeInTheDocument();
  });
});
