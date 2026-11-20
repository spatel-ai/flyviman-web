export const PAGE_SIZE = 20;

/** Payment statuses finance filters by; "ALL" leaves the filter out. */
export const PAYMENT_STATUS_OPTIONS = [
  { value: "ALL", label: "All payments" },
  { value: "SUCCEEDED", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "INITIATED", label: "Started" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUND_PENDING", label: "Refund pending" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export type PaymentStatusFilter =
  (typeof PAYMENT_STATUS_OPTIONS)[number]["value"];

export interface PaymentListFilter {
  status: PaymentStatusFilter;
  page: number;
}

function parsePage(value: string | null): number {
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return page >= 1 ? page : 1;
}

/** Reads the view from the URL. Anything not understood falls back to the default. */
export function parsePaymentFilter(params: {
  get(name: string): string | null;
}): PaymentListFilter {
  const status = params.get("status");
  return {
    status:
      PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.value ??
      "ALL",
    page: parsePage(params.get("page")),
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialisePaymentFilter(filter: PaymentListFilter): string {
  const params = new URLSearchParams();
  if (filter.status !== "ALL") params.set("status", filter.status);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** How a payment's purpose reads; an unknown one is shown as sent. */
export function purposeLabel(purpose: string): string {
  return (
    { FULL: "Full", DEPOSIT: "Deposit", BALANCE: "Balance" }[purpose] ?? purpose
  );
}
