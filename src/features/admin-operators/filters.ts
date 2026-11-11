import type { OperatorStatus } from "@/lib/api/types";

export type StatusFilter = OperatorStatus | "ALL";

export interface OperatorFilter {
  status: StatusFilter;
  /** Part of the legal or trading name; empty when not searching. */
  q: string;
  page: number;
}

export const PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 100;
export const DEFAULT_STATUS: StatusFilter = "PENDING_REVIEW";

/** The status tabs, in the order a reviewer works through them. */
export const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "PENDING_REVIEW", label: "Waiting for review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Not approved" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DRAFT", label: "Draft" },
  { value: "ALL", label: "All" },
];

const EMPTY_TITLES: Record<StatusFilter, string> = {
  PENDING_REVIEW: "No operators waiting for review",
  APPROVED: "No approved operators",
  REJECTED: "No operators that were not approved",
  SUSPENDED: "No suspended operators",
  DRAFT: "No draft applications",
  ALL: "No operators yet",
};

function isStatusFilter(value: string | null): value is StatusFilter {
  return STATUS_TABS.some((tab) => tab.value === value);
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Reads the view from the URL. Anything not understood falls back to the default. */
export function parseOperatorFilter(params: {
  get(name: string): string | null;
}): OperatorFilter {
  const status = params.get("status");
  return {
    status: isStatusFilter(status) ? status : DEFAULT_STATUS,
    q: (params.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH),
    page: parsePage(params.get("page")),
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialiseOperatorFilter(filter: OperatorFilter): string {
  const params = new URLSearchParams();
  if (filter.status !== DEFAULT_STATUS) params.set("status", filter.status);
  const q = filter.q.trim().slice(0, SEARCH_MAX_LENGTH);
  if (q) params.set("q", q);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** The query for `GET admin/operators`. */
export function operatorListQuery(
  filter: OperatorFilter,
): Record<string, string | number | undefined> {
  return {
    status: filter.status === "ALL" ? undefined : filter.status,
    q: filter.q || undefined,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

export function emptyTitle(filter: OperatorFilter): string {
  return filter.q
    ? "No operators match your search"
    : EMPTY_TITLES[filter.status];
}
