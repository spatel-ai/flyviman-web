"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { addDays, todayIn } from "@/lib/format/zoned";

type Location = Schemas["LocationResponseDto"];
type Calendar = Schemas["FareCalendarResponseDto"];

/** A location by its IATA or ICAO code, or null when there is none. */
export function useLocationByCode(code: string) {
  return useQuery({
    queryKey: queryKeys.locationByCode(code),
    queryFn: async () => {
      const { data } = await apiFetch<Location[]>("locations", {
        query: { q: code, pageSize: 1 },
      });
      const first = data[0];
      return first && (first.iata === code || first.icao === code)
        ? first
        : null;
    },
    staleTime: Infinity,
  });
}

/**
 * The lowest estimate for a route over the coming weeks, for a popular
 * route card: the month a week from today, two passengers. An estimate,
 * shown as one (business rule 1).
 */
export function useRouteFare(originId?: string, destinationId?: string) {
  return useQuery({
    queryKey: queryKeys.fareCalendar({ originId, destinationId, card: true }),
    queryFn: async () => {
      // Computed here, in the browser: a prerendered page has no "today".
      const month = addDays(todayIn("Asia/Kolkata"), 7).slice(0, 7);
      const { data } = await apiFetch<Calendar>("search/calendar", {
        query: {
          category: "PRIVATE_CHARTER",
          originId,
          destinationId,
          month,
          passengerCount: 2,
        },
      });
      // The whole price, with its type and currency, so the card shows it
      // through PriceLabel (business rule 1), not as a bare figure.
      let lowest: (typeof data.days)[number]["lowest"] = null;
      for (const day of data.days) {
        if (
          day.lowest &&
          (!lowest || day.lowest.amountMinor < lowest.amountMinor)
        ) {
          lowest = day.lowest;
        }
      }
      return lowest;
    },
    enabled: Boolean(originId && destinationId),
    staleTime: 5 * 60_000,
  });
}
