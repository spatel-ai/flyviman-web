import { describe, expect, it } from "vitest";
import { isRoundTrip, shiftReturn, strategyLabel } from "./round-trip";

describe("round trip helpers", () => {
  it("says the strategy in plain words", () => {
    expect(strategyLabel("WAIT")).toBe("Aircraft waits at destination");
    expect(strategyLabel("RETURN_TO_BASE")).toBe(
      "Returns to base between flights",
    );
    expect(strategyLabel(null)).toBeNull();
    expect(strategyLabel(undefined)).toBeNull();
  });

  it("treats a result without a trip type as one way", () => {
    expect(isRoundTrip({})).toBe(false);
    expect(isRoundTrip({ tripType: "ONE_WAY" })).toBe(false);
    expect(isRoundTrip({ tripType: "ROUND_TRIP" })).toBe(true);
  });

  it("keeps the stay when the departure moves", () => {
    expect(
      shiftReturn(
        "2026-12-05T04:30:00.000Z",
        "2026-12-07T10:30:00.000Z",
        "2026-12-10T04:30:00.000Z",
      ),
    ).toBe("2026-12-12T10:30:00.000Z");
  });
});
