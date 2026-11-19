import { rupeesToPaise } from "@/lib/format/money";

export interface EmptyLegFilter {
  origin: string;
  destination: string;
  /** Calendar days, "YYYY-MM-DD", or "". */
  from: string;
  to: string;
  passengers: number | null;
  /** Rupees as typed, converted to paise only when the query is built. */
  maxPrice: string;
  page: number;
}

export const PAGE_SIZE = 12;

export const NO_FILTER: EmptyLegFilter = {
  origin: "",
  destination: "",
  from: "",
  to: "",
  passengers: null,
  maxPrice: "",
  page: 1,
};

/** Paise for a typed rupee amount, or null when empty or not an amount. */
function paise(input: string): number | null {
  try {
    return rupeesToPaise(input);
  } catch {
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function uuid(value: string | null): string {
  return value && UUID.test(value) ? value : "";
}

function day(value: string | null): string {
  if (!value || !DAY.test(value)) return "";
  return Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) ? "" : value;
}

function whole(value: string | null, min: number, max: number): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

/** Reads the view from the URL; anything not understood falls back to the default. */
export function parseEmptyLegFilter(params: {
  get(name: string): string | null;
}): EmptyLegFilter {
  const maxPrice = params.get("maxPrice") ?? "";
  return {
    origin: uuid(params.get("origin")),
    destination: uuid(params.get("destination")),
    from: day(params.get("from")),
    to: day(params.get("to")),
    passengers: whole(params.get("passengers"), 1, 100),
    maxPrice: paise(maxPrice) === null ? "" : maxPrice,
    page: whole(params.get("page"), 1, 100_000) ?? 1,
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialiseEmptyLegFilter(filter: EmptyLegFilter): string {
  const params = new URLSearchParams();
  if (filter.origin) params.set("origin", filter.origin);
  if (filter.destination) params.set("destination", filter.destination);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.passengers) params.set("passengers", String(filter.passengers));
  if (filter.maxPrice) params.set("maxPrice", filter.maxPrice);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** The query for `GET /empty-legs`; the price goes as paise. */
export function emptyLegQuery(
  filter: EmptyLegFilter,
): Record<string, string | number | undefined> {
  return {
    origin: filter.origin || undefined,
    destination: filter.destination || undefined,
    from: filter.from || undefined,
    to: filter.to || undefined,
    passengers: filter.passengers ?? undefined,
    maxPrice: paise(filter.maxPrice) ?? undefined,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

export function isFiltered(filter: EmptyLegFilter): boolean {
  return serialiseEmptyLegFilter({ ...filter, page: 1 }) !== "";
}

/** A window that ends before it starts cannot match anything. */
export function windowError(filter: EmptyLegFilter): string | undefined {
  return filter.from && filter.to && filter.to < filter.from
    ? "The latest day must not be before the earliest day."
    : undefined;
}
