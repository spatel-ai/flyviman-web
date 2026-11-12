"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  addMonths,
  dayStartUtc,
  daysBetween,
  daysFrom,
  formatMonth,
  monthGrid,
  monthStart,
  todayIn,
  weekStart,
  formatCalendarDay,
} from "@/lib/format/zoned";

export type View = "week" | "month";

/** The zone the fleet timeline is drawn in: India only at launch (D-061). */
export const FLEET_ZONE = "Asia/Kolkata";

/** A real calendar day: "2026-13-01" and "2026-02-30" are refused. */
export function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export interface CalendarRange {
  view: View;
  /** The day the range is anchored on (from the address, else today). */
  anchor: string;
  /** The days drawn, in order. */
  days: string[];
  /** The UTC instants the API is asked for: start of the first day to the
   * start of the day after the last. */
  from: string;
  to: string;
  label: string;
  previous: () => void;
  next: () => void;
  today: () => void;
  setView: (view: View) => void;
}

/**
 * The visible days, kept in the address (`?view=week&date=2026-11-18`) so a
 * reload or a shared link shows the same range. `grid` lays a month out as
 * six full weeks (the aircraft calendar); otherwise a month is its own days.
 */
export function useCalendarRange(
  zone: string,
  { grid }: { grid: boolean },
): CalendarRange {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view: View = params.get("view") === "month" ? "month" : "week";
  const requested = params.get("date") ?? "";
  const anchor = isCalendarDay(requested) ? requested : todayIn(zone);

  let days: string[];
  let label: string;
  if (view === "week") {
    days = daysFrom(weekStart(anchor), 7);
    label = `${formatCalendarDay(days[0])} – ${formatCalendarDay(days[6])}`;
  } else if (grid) {
    days = monthGrid(anchor);
    label = formatMonth(monthStart(anchor));
  } else {
    const first = monthStart(anchor);
    days = daysFrom(first, daysBetween(first, addMonths(first, 1)));
    label = formatMonth(first);
  }

  function go(nextView: View, date: string) {
    router.replace(`${pathname}?view=${nextView}&date=${date}`, {
      scroll: false,
    });
  }

  return {
    view,
    anchor,
    days,
    from: dayStartUtc(days[0], zone),
    to: dayStartUtc(addDays(days[days.length - 1], 1), zone),
    label,
    previous: () =>
      go(view, view === "week" ? addDays(anchor, -7) : addMonths(anchor, -1)),
    next: () =>
      go(view, view === "week" ? addDays(anchor, 7) : addMonths(anchor, 1)),
    today: () => go(view, todayIn(zone)),
    setView: (nextView) => go(nextView, anchor),
  };
}
