import { describe, expect, it } from "vitest";
import { isCalendarDay } from "./range";

describe("calendar address", () => {
  it("accepts only real calendar days", () => {
    expect(isCalendarDay("2026-11-18")).toBe(true);
    expect(isCalendarDay("2028-02-29")).toBe(true);
    expect(isCalendarDay("2026-13-01")).toBe(false);
    expect(isCalendarDay("2026-02-30")).toBe(false);
    expect(isCalendarDay("18-11-2026")).toBe(false);
    expect(isCalendarDay("")).toBe(false);
  });
});
