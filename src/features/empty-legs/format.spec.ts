import { describe, expect, it } from "vitest";
import { enquiryHref, isLapsed, placeLabel, routeLabel } from "./format";
import type { EmptyLegOffer } from "./types";

const OFFER: EmptyLegOffer = {
  id: "0b9a1f0e-2b1c-4c7e-8f0a-1a2b3c4d5e6f",
  reference: "EL-0001",
  aircraft: { type: "Citation XLS", category: "MIDSIZE_JET", seats: 8 },
  operatorName: "Local Test Aviation",
  origin: { id: "o", name: "Chhatrapati Shivaji", city: "Mumbai", iata: "BOM" },
  destination: { id: "d", name: "Indira Gandhi", iata: null, icao: "VIDP" },
  departureFrom: "2026-12-01T04:00:00Z",
  departureTo: "2026-12-02T04:00:00Z",
  seatsAvailable: 6,
  price: { amountMinor: 20000000, currency: "INR", priceType: "QUOTE" },
  validUntil: "2026-11-30T12:00:00Z",
  conditions: "Subject to operator confirmation.",
  status: "PUBLISHED",
};

describe("empty-leg formatting", () => {
  it("names a place with its code", () => {
    expect(placeLabel(OFFER.origin)).toBe("Mumbai (BOM)");
    expect(placeLabel(OFFER.destination)).toBe("Indira Gandhi (VIDP)");
    expect(routeLabel(OFFER)).toBe("Mumbai (BOM) to Indira Gandhi (VIDP)");
  });

  it("knows when validity has passed", () => {
    expect(isLapsed(OFFER, Date.parse("2026-11-29T00:00:00Z"))).toBe(false);
    expect(isLapsed(OFFER, Date.parse("2026-11-30T12:00:00Z"))).toBe(true);
  });

  it("writes an enquiry, not a booking, with the offer in the message", () => {
    const href = enquiryHref(OFFER);
    expect(href.startsWith("/contact?")).toBe(true);
    const params = new URLSearchParams(
      href.slice("/contact?".length).split("#")[0],
    );
    expect(params.get("message")).toContain("EL-0001");
    expect(params.get("message")).toContain(
      "Mumbai (BOM) to Indira Gandhi (VIDP)",
    );
  });
});
