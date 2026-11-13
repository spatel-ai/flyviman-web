import type { Schemas } from "@/lib/api/types";

type Result = Schemas["SearchResultDto"];

export type Sort = "price" | "fastest" | "seats";

export interface Filters {
  classes: string[];
  operators: string[];
  /** Paise. Results on request are kept: they have no price to compare. */
  maxPriceMinor: number | null;
  maxMinutes: number | null;
  minSeats: number | null;
}

export const NO_FILTERS: Filters = {
  classes: [],
  operators: [],
  maxPriceMinor: null,
  maxMinutes: null,
  minSeats: null,
};

const number = (value: string | null): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/** Filters and sort from the address, so a filtered view can be shared. */
export function readFilters(params: URLSearchParams): {
  filters: Filters;
  sort: Sort;
} {
  const sort = params.get("sort");
  return {
    filters: {
      classes: params.getAll("class"),
      operators: params.getAll("operator"),
      maxPriceMinor: number(params.get("maxPrice")),
      maxMinutes: number(params.get("maxMinutes")),
      minSeats: number(params.get("minSeats")),
    },
    sort: sort === "fastest" || sort === "seats" ? sort : "price",
  };
}

export function writeFilters(filters: Filters, sort: Sort): string {
  const params = new URLSearchParams();
  for (const value of filters.classes) params.append("class", value);
  for (const value of filters.operators) params.append("operator", value);
  if (filters.maxPriceMinor)
    params.set("maxPrice", String(filters.maxPriceMinor));
  if (filters.maxMinutes) params.set("maxMinutes", String(filters.maxMinutes));
  if (filters.minSeats) params.set("minSeats", String(filters.minSeats));
  if (sort !== "price") params.set("sort", sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function applyFilters(
  results: Result[],
  filters: Filters,
  sort: Sort,
): Result[] {
  const kept = results.filter(
    (result) =>
      (filters.classes.length === 0 ||
        filters.classes.includes(result.aircraft.category)) &&
      (filters.operators.length === 0 ||
        filters.operators.includes(result.operatorName)) &&
      (filters.maxPriceMinor == null ||
        result.price == null ||
        result.price.amountMinor <= filters.maxPriceMinor) &&
      // Like a price on request, an unknown flight time is not hidden.
      (filters.maxMinutes == null ||
        result.flightMinutes == null ||
        result.flightMinutes <= filters.maxMinutes) &&
      (filters.minSeats == null ||
        result.aircraft.passengerCapacity >= filters.minSeats),
  );
  const last = Number.MAX_SAFE_INTEGER;
  const key: Record<Sort, (result: Result) => number> = {
    price: (result) => result.price?.amountMinor ?? last,
    fastest: (result) => result.flightMinutes ?? last,
    seats: (result) => -result.aircraft.passengerCapacity,
  };
  return [...kept].sort((a, b) => key[sort](a) - key[sort](b));
}

/** How many results each option would keep, for the checkbox counts. */
export function facetCounts(
  results: Result[],
  pick: (result: Result) => string,
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const result of results) {
    counts.set(pick(result), (counts.get(pick(result)) ?? 0) + 1);
  }
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

export function priceBounds(
  results: Result[],
): { min: number; max: number } | null {
  const prices = results.flatMap((result) =>
    result.price ? [result.price.amountMinor] : [],
  );
  return prices.length > 0
    ? { min: Math.min(...prices), max: Math.max(...prices) }
    : null;
}
