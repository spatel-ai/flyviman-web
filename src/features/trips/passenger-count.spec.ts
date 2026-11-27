import { describe, expect, it } from "vitest";
import { fewerNamedWarning, passengerCountText } from "./passenger-count";

describe("passengerCountText", () => {
  it("says how many are named only when that differs from the party size", () => {
    expect(passengerCountText(2, 1)).toBe("2 passengers, 1 named");
    expect(passengerCountText(1, 0)).toBe("1 passenger, 0 named");
    expect(passengerCountText(2, 2)).toBeNull();
  });
});

describe("fewerNamedWarning", () => {
  it("warns before sending when fewer people are chosen than seats", () => {
    expect(fewerNamedWarning(2, 1)).toBe(
      "2 seats requested, 1 passenger named. You can add the rest later from the trip page.",
    );
  });
  it("is silent with none chosen (the form asks for the lead) or all seats named", () => {
    expect(fewerNamedWarning(2, 0)).toBeNull();
    expect(fewerNamedWarning(2, 2)).toBeNull();
  });
});
