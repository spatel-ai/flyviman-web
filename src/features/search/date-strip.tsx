"use client";

import { useQueries } from "@tanstack/react-query";
import { shortRupees } from "@/components/booking/format";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { addDays, formatCalendarDay } from "@/lib/format/zoned";
import { cn } from "@/lib/utils";

type Calendar = Schemas["FareCalendarResponseDto"];

/**
 * Three days either side of the chosen one, each with its lowest estimate,
 * like a fare strip. Choosing a day runs the same search for that day.
 */
export function DateStrip({
  date,
  today,
  route,
  busy,
  onChoose,
}: {
  date: string;
  today: string;
  route: {
    category: "PRIVATE_CHARTER" | "HELICOPTER";
    originId: string;
    destinationId: string;
    passengerCount: number;
    aircraftCategory?: string;
  };
  busy: boolean;
  onChoose: (date: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(date, index - 3),
  );
  const months = [...new Set(days.map((day) => day.slice(0, 7)))];
  const calendars = useQueries({
    queries: months.map((month) => {
      const params = { ...route, month };
      return {
        queryKey: queryKeys.fareCalendar(params),
        queryFn: () => apiFetch<Calendar>("search/calendar", { query: params }),
        staleTime: 5 * 60_000,
        enabled: Boolean(today),
      };
    }),
  });
  const fares = new Map(
    calendars.flatMap((query) =>
      (query.data?.data.days ?? []).map((day) => [day.date, day] as const),
    ),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-caption text-muted">
        Lowest estimates for a 10:00 departure. The operator confirms the price.
      </p>
      <div
        role="group"
        aria-label="Nearby dates, lowest estimates"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        {days.map((day) => {
          const fare = fares.get(day);
          const past = Boolean(today) && day < today;
          const selected = day === date;
          return (
            <button
              key={day}
              type="button"
              disabled={past || busy}
              aria-pressed={selected}
              onClick={() => onChoose(day)}
              className={cn(
                "flex min-w-24 flex-1 flex-col items-center gap-0.5 rounded-md px-3 py-2 text-center",
                "transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "bg-accent-fill text-accent-foreground"
                  : "bg-surface hover:bg-border/60 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <span className="text-body-sm font-medium">
                {formatCalendarDay(day)}
              </span>
              <span
                className={cn(
                  "text-caption tabular-nums",
                  selected ? "text-accent-foreground" : "text-muted",
                )}
              >
                {fare?.lowest
                  ? `from ${shortRupees(fare.lowest.amountMinor)}`
                  : fare
                    ? "No aircraft"
                    : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
