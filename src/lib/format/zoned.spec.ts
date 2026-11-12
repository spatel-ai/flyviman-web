import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysBetween,
  formatCalendarDay,
  formatMonth,
  formatTimeRange,
  localToUtc,
  monthGrid,
  todayIn,
  utcToLocal,
  weekStart,
  zoneName,
  zoneOffsetMinutes,
} from "./zoned";

const IST = "Asia/Kolkata";
const LONDON = "Europe/London";

describe("zoned time", () => {
  it("knows each zone's offset, including daylight saving", () => {
    expect(zoneOffsetMinutes(new Date("2026-11-18T00:00:00Z"), IST)).toBe(330);
    expect(zoneOffsetMinutes(new Date("2026-07-01T12:00:00Z"), LONDON)).toBe(
      60,
    );
    expect(zoneOffsetMinutes(new Date("2026-12-01T12:00:00Z"), LONDON)).toBe(0);
  });

  it("turns a local wall time into UTC and back", () => {
    expect(localToUtc("2026-11-18", "10:00", IST)).toBe(
      "2026-11-18T04:30:00.000Z",
    );
    // Local midnight is the previous day in UTC.
    expect(localToUtc("2026-11-18", "00:00", IST)).toBe(
      "2026-11-17T18:30:00.000Z",
    );
    expect(localToUtc("2026-07-01", "09:00", LONDON)).toBe(
      "2026-07-01T08:00:00.000Z",
    );
    expect(utcToLocal("2026-11-17T18:30:00.000Z", IST)).toEqual({
      date: "2026-11-18",
      time: "00:00",
    });
  });

  it("reads today in the zone, not in UTC", () => {
    expect(todayIn(IST, new Date("2026-11-17T19:00:00Z"))).toBe("2026-11-18");
    expect(todayIn(LONDON, new Date("2026-11-17T19:00:00Z"))).toBe(
      "2026-11-17",
    );
  });

  it("does day, week and month arithmetic on calendar days", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(daysBetween("2026-11-16", "2026-11-23")).toBe(7);
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday → Monday
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-31", -1)).toBe("2025-12-01");
  });

  it("lays a month out as six Monday-first weeks", () => {
    const grid = monthGrid("2026-11-18");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-10-26"); // 1 Nov 2026 is a Sunday
    expect(grid).toContain("2026-11-30");
    expect(grid[41]).toBe("2026-12-06");
  });

  it("formats days, months and spans with the zone name", () => {
    expect(formatCalendarDay("2026-11-16")).toMatch(/Mon.*16.*Nov/);
    expect(formatMonth("2026-11-01")).toBe("November 2026");
    expect(zoneName(IST)).toBe("IST");
    expect(
      formatTimeRange("2026-11-18T04:30:00Z", "2026-11-18T08:30:00Z", IST),
    ).toBe("18 Nov, 10:00–14:00 IST");
    expect(
      formatTimeRange("2026-11-18T16:30:00Z", "2026-11-18T20:30:00Z", IST),
    ).toBe("18 Nov 22:00 – 19 Nov 02:00 IST");
  });
});
