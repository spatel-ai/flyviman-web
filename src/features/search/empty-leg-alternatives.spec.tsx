import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EmptyLegOffer } from "@/lib/empty-legs/types";
import { EmptyLegAlternatives } from "./empty-leg-alternatives";

const place = (city: string, iata: string) => ({
  id: iata,
  name: city,
  city,
  iata,
  icao: null,
  timeZone: "Asia/Kolkata",
});

const offer = {
  id: "11111111-1111-1111-1111-111111111111",
  reference: "FLY-EL-AAAAAA",
  status: "PUBLISHED",
  aircraft: { type: "Cessna Citation", category: "LIGHT_JET", seats: 6 },
  operatorName: "Op",
  origin: place("Goa", "GOI"),
  destination: place("Mumbai", "BOM"),
  departureFrom: "2099-01-01T04:00:00.000Z",
  departureTo: "2099-01-01T12:00:00.000Z",
  seatsAvailable: 6,
  price: { amountMinor: 18_500_000, currency: "INR", priceType: "QUOTE" },
  validUntil: "2099-01-01T00:00:00.000Z",
  conditions: "Subject to repositioning.",
} as unknown as EmptyLegOffer;

describe("EmptyLegAlternatives", () => {
  it("shows nothing when there are none", () => {
    const { container } = render(<EmptyLegAlternatives offers={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("links each offer to its page with a labelled price", () => {
    render(<EmptyLegAlternatives offers={[offer]} />);
    expect(
      screen.getByRole("heading", { name: "Empty legs on this route" }),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: /Goa \(GOI\) to Mumbai/ });
    expect(link.getAttribute("href")).toBe(`/empty-legs/${offer.id}`);
    expect(screen.getByText("Quote")).toBeTruthy();
  });
});
