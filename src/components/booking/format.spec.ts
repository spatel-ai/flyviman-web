import { describe, expect, it } from "vitest";
import { calendarDayState, shortRupees } from "./format";

describe("shortRupees", () => {
  it("shortens in thousands, lakhs and crores", () => {
    expect(shortRupees(85_000_00)).toBe("₹85K");
    expect(shortRupees(4_20_000_00)).toBe("₹4.2L");
    expect(shortRupees(4_00_000_00)).toBe("₹4L");
    expect(shortRupees(1_25_00_000_00)).toBe("₹1.25Cr");
    expect(shortRupees(950_00)).toBe("₹950");
  });
});

describe("calendarDayState", () => {
  const base = { today: "2026-12-05", loaded: true, cheapestMinor: 100 };

  it("past days cannot be chosen", () => {
    expect(calendarDayState({ ...base, date: "2026-12-04" })).toBe("past");
  });

  it("before the calendar loads, future days are unknown", () => {
    expect(
      calendarDayState({ ...base, date: "2026-12-06", loaded: false }),
    ).toBe("unknown");
  });

  it("marks days without aircraft, with aircraft, and the cheapest", () => {
    expect(calendarDayState({ ...base, date: "2026-12-06" })).toBe("none");
    expect(
      calendarDayState({
        ...base,
        date: "2026-12-06",
        fare: { availableCount: 2, lowestMinor: 150 },
      }),
    ).toBe("available");
    expect(
      calendarDayState({
        ...base,
        date: "2026-12-07",
        fare: { availableCount: 1, lowestMinor: 100 },
      }),
    ).toBe("cheapest");
  });
});
