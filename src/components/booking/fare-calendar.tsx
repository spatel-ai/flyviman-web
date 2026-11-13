"use client";

import { useQueries } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SEARCH_LANDING } from "@/content/search";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  addMonths,
  formatCalendarDay,
  formatMonth,
  monthGrid,
  monthStart,
} from "@/lib/format/zoned";
import { cn } from "@/lib/utils";
import { FieldTile } from "./field-tile";
import { calendarDayState, shortRupees } from "./format";
import { ResponsivePicker, useIsDesktop } from "./responsive-picker";
import { useToday } from "./use-today";

type Calendar = Schemas["FareCalendarResponseDto"];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
/** Hourly departures offered in the picker, India time. */
export const DEPARTURE_TIMES = Array.from(
  { length: 16 },
  (_, index) => `${String(index + 6).padStart(2, "0")}:00`,
);

/** What the calendar needs to price days; prices only once a route is set. */
export interface CalendarRoute {
  kind: "charter" | "helicopter";
  originId: string;
  destinationId: string;
  passengerCount: number;
  aircraftCategory?: string;
}

function readyRoute(route: CalendarRoute): boolean {
  return (
    Boolean(route.originId && route.destinationId) &&
    route.originId !== route.destinationId &&
    route.passengerCount >= 1 &&
    route.passengerCount <= 50
  );
}

/**
 * The departure date and time. Once From and To are chosen, each day shows
 * the lowest estimate that day ("from ₹4.2L"), days with no aircraft are
 * greyed and the month's cheapest day is marked. Figures are estimates
 * (business rule 1), said in the legend.
 */
export function FareCalendar({
  date,
  time,
  onDateChange,
  onTimeChange,
  route,
  error,
}: {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  route: CalendarRoute;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const desktop = useIsDesktop();
  const today = useToday();
  // The month the visitor moved to; reset on close, so the picker opens on
  // the chosen date's month (or today's) every time.
  const [moved, setMoved] = useState<string | null>(null);
  const start = date || today;
  const first = moved ?? (start ? monthStart(start) : null);
  const months = first
    ? desktop
      ? [first, addMonths(first, 1)]
      : [first]
    : [];
  const ready = readyRoute(route);

  const calendars = useQueries({
    queries: months.map((month) => {
      const params = {
        category:
          route.kind === "helicopter" ? "HELICOPTER" : "PRIVATE_CHARTER",
        originId: route.originId,
        destinationId: route.destinationId,
        month: month.slice(0, 7),
        passengerCount: route.passengerCount,
        ...(route.kind === "charter" && route.aircraftCategory
          ? { aircraftCategory: route.aircraftCategory }
          : {}),
      };
      return {
        queryKey: queryKeys.fareCalendar(params),
        queryFn: () => apiFetch<Calendar>("search/calendar", { query: params }),
        enabled: open && ready && Boolean(today),
        staleTime: 5 * 60_000,
      };
    }),
  });

  return (
    <ResponsivePicker
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMoved(null);
      }}
      title="Departure date and time"
      width="lg"
      room={500}
      align="center"
      trigger={
        <FieldTile
          label="Departure"
          icon={CalendarDays}
          value={date ? formatCalendarDay(date) : undefined}
          placeholder="Choose date"
          hint={`${time} · India time`}
          error={error}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous month"
            disabled={!today || !first || first <= monthStart(today)}
            onClick={() => first && setMoved(addMonths(first, -1))}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <p className="text-caption text-muted">
            {ready
              ? SEARCH_LANDING.calendarLegend
              : "Choose From and To to see estimates for each day."}
          </p>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next month"
            onClick={() => first && setMoved(addMonths(first, 1))}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {months.map((month, monthIndex) => {
            const answer = calendars[monthIndex]?.data?.data;
            const fares = new Map(
              (answer?.days ?? []).map((day) => [day.date, day]),
            );
            const prices = (answer?.days ?? []).flatMap((day) =>
              day.lowest ? [day.lowest.amountMinor] : [],
            );
            const cheapest = prices.length > 0 ? Math.min(...prices) : null;
            return (
              <div key={month} className="flex min-w-0 flex-col gap-2">
                <p className="text-title">{formatMonth(month)}</p>
                <div
                  role="grid"
                  aria-label={formatMonth(month)}
                  className="grid grid-cols-7 gap-0.5"
                >
                  {WEEKDAYS.map((weekday) => (
                    <span
                      key={weekday}
                      role="columnheader"
                      className="text-center text-caption text-muted"
                    >
                      {weekday}
                    </span>
                  ))}
                  {monthGrid(month).map((day) => {
                    if (day.slice(0, 7) !== month.slice(0, 7)) {
                      return <span key={day} aria-hidden="true" />;
                    }
                    const fare = fares.get(day);
                    const state = calendarDayState({
                      date: day,
                      today,
                      loaded: ready && Boolean(answer),
                      fare: fare
                        ? {
                            availableCount: fare.availableCount,
                            lowestMinor: fare.lowest?.amountMinor ?? null,
                          }
                        : undefined,
                      cheapestMinor: cheapest,
                    });
                    const selected = day === date;
                    const price = fare?.lowest
                      ? shortRupees(fare.lowest.amountMinor)
                      : null;
                    const spoken =
                      state === "none"
                        ? "no aircraft"
                        : price
                          ? `estimate from ${price}${state === "cheapest" ? ", cheapest day" : ""}`
                          : "";
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={state === "past"}
                        aria-pressed={selected}
                        aria-label={[formatCalendarDay(day), spoken]
                          .filter(Boolean)
                          .join(", ")}
                        onClick={() => onDateChange(day)}
                        className={cn(
                          "flex h-11 w-full flex-col items-center justify-center rounded-sm text-body-sm tabular-nums",
                          "transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
                          state === "past" && "cursor-not-allowed text-subtle",
                          state === "none" && "text-subtle hover:bg-surface",
                          (state === "available" || state === "unknown") &&
                            "hover:bg-surface",
                          state === "cheapest" &&
                            "bg-success/10 hover:bg-success/20",
                          selected &&
                            "bg-accent-fill text-accent-foreground hover:bg-accent-fill",
                        )}
                      >
                        <span className="font-medium">
                          {Number(day.slice(8))}
                        </span>
                        {price ? (
                          <span
                            className={cn(
                              "text-micro",
                              selected
                                ? "text-accent-foreground"
                                : state === "cheapest"
                                  ? "text-success"
                                  : "text-muted",
                            )}
                          >
                            {price}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <fieldset className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <legend className="text-caption font-medium tracking-wide text-muted uppercase">
              Departure time (India)
            </legend>
            <Button size="sm" disabled={!date} onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {DEPARTURE_TIMES.map((slot) => (
              <button
                key={slot}
                type="button"
                aria-pressed={slot === time}
                onClick={() => onTimeChange(slot)}
                className={cn(
                  "h-9 rounded-pill text-body-sm tabular-nums transition-colors duration-150 ease-standard",
                  slot === time
                    ? "bg-accent-fill text-accent-foreground"
                    : "bg-surface hover:bg-border/60",
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </ResponsivePicker>
  );
}
