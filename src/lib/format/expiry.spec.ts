import { describe, expect, it } from "vitest";
import { daysUntil, expiryState, indiaToday } from "./expiry";

const today = "2026-11-13";

describe("expiry", () => {
  it("takes today in India", () => {
    expect(indiaToday(new Date("2026-11-13T20:00:00Z"))).toBe("2026-11-14");
  });

  it("counts days to a date-only value", () => {
    expect(daysUntil("2026-11-20", today)).toBe(7);
    expect(daysUntil("2026-11-10T00:00:00.000Z", today)).toBe(-3);
  });

  it("says nothing beyond 30 days", () => {
    expect(expiryState("2026-12-14", today)).toBeNull();
  });

  it("warns within 30 days and turns red in the last week", () => {
    expect(expiryState("2026-12-13", today)).toEqual({
      label: "Expires in 30 days",
      tone: "warning",
    });
    expect(expiryState("2026-11-20", today)).toEqual({
      label: "Expires in 7 days",
      tone: "danger",
    });
    expect(expiryState("2026-11-14", today)?.label).toBe("Expires tomorrow");
    expect(expiryState(today, today)?.label).toBe("Expires today");
  });

  it("names how long ago it expired", () => {
    expect(expiryState("2026-11-12", today)?.label).toBe("Expired yesterday");
    expect(expiryState("2026-11-01", today)).toEqual({
      label: "Expired 12 days ago",
      tone: "danger",
    });
  });
});
