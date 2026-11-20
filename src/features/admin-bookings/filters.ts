import type { Schemas } from "@/lib/api/types";

type Status = Schemas["BookingStatus"];
type PaymentStatus = Schemas["BookingPaymentStatus"];
type Category = Schemas["ServiceCategory"];

export interface BookingFilter {
  q: string;
  status: Status | "ALL";
  paymentStatus: PaymentStatus | "ALL";
  category: Category | "ALL";
  /** A day, "2026-11-20", or "". */
  from: string;
  to: string;
  page: number;
}

export const PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 254;

export const DEFAULT_FILTER: BookingFilter = {
  q: "",
  status: "ALL",
  paymentStatus: "ALL",
  category: "ALL",
  from: "",
  to: "",
  page: 1,
};

/** Every booking status, in the order of its life. The API decides which are allowed. */
export const STATUSES: Status[] = [
  "REQUESTED",
  "OPERATOR_PENDING",
  "CLARIFICATION_REQUESTED",
  "PRICE_CONFIRMED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "SCHEDULED",
  "COMPLETED",
  "OPERATOR_UNAVAILABLE",
  "QUOTE_DECLINED",
  "EXPIRED",
  "CANCELLED",
];

export const STATUS_LABELS: Record<Status, string> = {
  REQUESTED: "Requested",
  OPERATOR_PENDING: "Awaiting operator",
  CLARIFICATION_REQUESTED: "Clarification needed",
  PRICE_CONFIRMED: "Price confirmed",
  AWAITING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  OPERATOR_UNAVAILABLE: "Operator unavailable",
  QUOTE_DECLINED: "Quote declined",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const PAYMENT_STATUSES: PaymentStatus[] = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "REFUND_PENDING",
  "REFUNDED",
];

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  SCHEDULED_AIRLINE: "Scheduled airline",
  PRIVATE_CHARTER: "Private charter",
  HELICOPTER: "Helicopter",
  EMPTY_LEG: "Empty leg",
  AIR_AMBULANCE: "Air ambulance",
};

/** An unknown category from a newer API shows as sent. */
export function categoryName(category: string): string {
  return Object.hasOwn(CATEGORY_LABELS, category)
    ? CATEGORY_LABELS[category as Category]
    : category;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export const STATUS_OPTIONS = [
  { value: "ALL", label: "Any status" },
  ...STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
];
export const PAYMENT_OPTIONS = [
  { value: "ALL", label: "Any payment" },
  ...PAYMENT_STATUSES.map((value) => ({
    value,
    label: PAYMENT_LABELS[value],
  })),
];
export const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Any category" },
  ...CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
];

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function parseDay(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? "" : value;
}

/** Reads the view from the URL. Anything not understood falls back to the default. */
export function parseBookingFilter(params: {
  get(name: string): string | null;
}): BookingFilter {
  const status = params.get("status");
  const payment = params.get("payment");
  const category = params.get("category");
  return {
    q: (params.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH),
    status: STATUSES.find((known) => known === status) ?? "ALL",
    paymentStatus: PAYMENT_STATUSES.find((known) => known === payment) ?? "ALL",
    category: CATEGORIES.find((known) => known === category) ?? "ALL",
    from: parseDay(params.get("from")),
    to: parseDay(params.get("to")),
    page: parsePage(params.get("page")),
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialiseBookingFilter(filter: BookingFilter): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.status !== "ALL") params.set("status", filter.status);
  if (filter.paymentStatus !== "ALL")
    params.set("payment", filter.paymentStatus);
  if (filter.category !== "ALL") params.set("category", filter.category);
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

/** The query for `GET admin/bookings`. `to` includes the whole last day. */
export function bookingListQuery(
  filter: BookingFilter,
): Record<string, string | number | undefined> {
  return {
    q: filter.q || undefined,
    status: filter.status === "ALL" ? undefined : filter.status,
    paymentStatus:
      filter.paymentStatus === "ALL" ? undefined : filter.paymentStatus,
    category: filter.category === "ALL" ? undefined : filter.category,
    from: filter.from ? startOfDay(filter.from) : undefined,
    to: filter.to ? startOfDay(filter.to, 1) : undefined,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

export function isFiltered(filter: BookingFilter): boolean {
  return (
    filter.q !== "" ||
    filter.status !== "ALL" ||
    filter.paymentStatus !== "ALL" ||
    filter.category !== "ALL" ||
    filter.from !== "" ||
    filter.to !== ""
  );
}
