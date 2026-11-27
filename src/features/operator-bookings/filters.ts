import type { Schemas } from "@/lib/api/types";

type Status = Schemas["BookingStatus"];

export const PAGE_SIZE = 20;

/** "upcoming" is the API's default view (no status sent): confirmed and scheduled. */
export const STATUS_OPTIONS: { value: "upcoming" | Status; label: string }[] = [
  { value: "upcoming", label: "Upcoming trips" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "CANCELLED", label: "Cancelled" },
];

export interface BookingFilter {
  status: "upcoming" | Status;
  aircraftId: string;
  /** A day, "2026-11-20", or "". */
  from: string;
  to: string;
  page: number;
}

export const DEFAULT_FILTER: BookingFilter = {
  status: "upcoming",
  aircraftId: "",
  from: "",
  to: "",
  page: 1,
};

function parseDay(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? "" : value;
}

/** Reads the view from the URL; anything not understood falls back. */
export function parseFilter(params: {
  get(name: string): string | null;
}): BookingFilter {
  const status = params.get("status");
  const page = params.get("page");
  const aircraft = params.get("aircraft") ?? "";
  return {
    status:
      STATUS_OPTIONS.find((known) => known.value === status)?.value ??
      "upcoming",
    aircraftId: /^[0-9a-f-]{36}$/i.test(aircraft) ? aircraft : "",
    from: parseDay(params.get("from")),
    to: parseDay(params.get("to")),
    page:
      page && /^\d{1,6}$/.test(page) && Number(page) >= 1 ? Number(page) : 1,
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialiseFilter(filter: BookingFilter): string {
  const params = new URLSearchParams();
  if (filter.status !== "upcoming") params.set("status", filter.status);
  if (filter.aircraftId) params.set("aircraft", filter.aircraftId);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** Start of a day in India (the portal's time zone), as an instant. */
function startOfDay(day: string, plusDays = 0): string {
  const start = new Date(`${day}T00:00:00+05:30`);
  start.setUTCDate(start.getUTCDate() + plusDays);
  return start.toISOString();
}

/** The query for `GET operator/bookings`. `to` includes the whole last day. */
/** Finished trips read latest first, the rest soonest first. */
export function finishedStatus(filter: BookingFilter): boolean {
  return filter.status === "COMPLETED" || filter.status === "CANCELLED";
}

export function listQuery(filter: BookingFilter) {
  return {
    status: filter.status === "upcoming" ? undefined : filter.status,
    aircraftId: filter.aircraftId || undefined,
    departureFrom: filter.from ? startOfDay(filter.from) : undefined,
    departureTo: filter.to ? startOfDay(filter.to, 1) : undefined,
    sort: finishedStatus(filter) ? "departure_desc" : "departure_asc",
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

export function isFiltered(filter: BookingFilter): boolean {
  return (
    filter.status !== "upcoming" ||
    filter.aircraftId !== "" ||
    filter.from !== "" ||
    filter.to !== ""
  );
}
