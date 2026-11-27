import { describe, expect, it } from "vitest";
import { entityTypeLabel, shortId } from "./labels";

describe("audit labels", () => {
  it("spaces a type name", () => {
    expect(entityTypeLabel("PricingRule")).toBe("Pricing rule");
    expect(entityTypeLabel("Booking")).toBe("Booking");
    expect(entityTypeLabel("AirAmbulanceRequest")).toBe(
      "Air ambulance request",
    );
  });

  it("shortens a UUID and leaves other IDs whole", () => {
    expect(shortId("3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab")).toBe("3f2b8c1e");
    expect(shortId("FLY-123")).toBe("FLY-123");
  });
});
