import type { Tone } from "@/components/ui/badge";
import type { Schemas } from "@/lib/api/types";

type BookingStatus = Schemas["BookingStatus"];
type Detail = Schemas["OperatorBookingRequestDetailDto"];

export const PAGE_SIZE = 20;

/** The inbox's status tabs. "waiting" is the API's default (no status sent). */
export const TABS: { value: string; label: string }[] = [
  { value: "waiting", label: "Waiting for you" },
  { value: "PRICE_CONFIRMED", label: "Price confirmed" },
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "OPERATOR_UNAVAILABLE", label: "Not taken" },
  { value: "QUOTE_DECLINED", label: "Quote declined" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

export interface RequestFilter {
  tab: string;
  aircraftId: string;
  page: number;
}

/** Reads the view from the URL; anything not understood falls back. */
export function parseFilter(params: {
  get(name: string): string | null;
}): RequestFilter {
  const tab = params.get("status");
  const page = params.get("page");
  const aircraft = params.get("aircraft") ?? "";
  return {
    tab: TABS.find((known) => known.value === tab)?.value ?? "waiting",
    aircraftId: /^[0-9a-f-]{36}$/i.test(aircraft) ? aircraft : "",
    page:
      page && /^\d{1,6}$/.test(page) && Number(page) >= 1 ? Number(page) : 1,
  };
}

export function serialiseFilter(filter: RequestFilter): string {
  const params = new URLSearchParams();
  if (filter.tab !== "waiting") params.set("status", filter.tab);
  if (filter.aircraftId) params.set("aircraft", filter.aircraftId);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

export function listQuery(filter: RequestFilter) {
  return {
    status: filter.tab === "waiting" ? undefined : filter.tab,
    aircraftId: filter.aircraftId || undefined,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

const QUOTE_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "Sent, waiting for the customer", tone: "info" },
  ACCEPTED: { label: "Accepted by the customer", tone: "success" },
  REJECTED: { label: "Declined by the customer", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "danger" },
  SUPERSEDED: { label: "Replaced by a newer quote", tone: "neutral" },
};

/** An unknown status from a newer API is shown as it is. */
export function quoteStatusLabel(status: string): {
  label: string;
  tone: Tone;
} {
  return Object.hasOwn(QUOTE_STATUS, status)
    ? QUOTE_STATUS[status]
    : { label: status, tone: "neutral" };
}

type Gate = Pick<Detail, "status" | "price" | "quote">;

/** A quote the customer can still answer. */
function quoteOpen(request: Gate): boolean {
  return request.quote?.open === true;
}

/** Accept at the proposed price: priced, waiting, and no quote out. */
export function canAccept(request: Gate): boolean {
  return (
    request.status === "OPERATOR_PENDING" &&
    request.price !== null &&
    !quoteOpen(request)
  );
}

/** Reject, ask a question or send a quote: only while the request waits. */
export function canRespond(request: Pick<Detail, "status">): boolean {
  return request.status === "OPERATOR_PENDING";
}

/** Whole minutes left before the hold lapses; negative once it has. */
export function holdMinutesLeft(expiresAt: string, now: number): number {
  return Math.floor((Date.parse(expiresAt) - now) / 60_000);
}

/** "5 h 20 min left", "12 min left" or "Lapsed". */
export function holdLabel(expiresAt: string, now: number): string {
  const minutes = holdMinutesLeft(expiresAt, now);
  if (minutes <= 0) return "Lapsed";
  const hours = Math.floor(minutes / 60);
  if (hours >= 48) return `${Math.floor(hours / 24)} days left`;
  return hours > 0
    ? `${hours} h ${minutes % 60} min left`
    : `${minutes} min left`;
}

export type { BookingStatus };
