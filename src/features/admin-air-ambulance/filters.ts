import {
  STATUS_OPTIONS,
  type AirAmbulanceStatus,
} from "@/lib/air-ambulance/labels";

export type AssigneeFilter = "ALL" | "me" | "none";
export type StatusFilter = AirAmbulanceStatus | "ALL";

export interface QueueFilter {
  status: StatusFilter;
  assignee: AssigneeFilter;
  page: number;
}

export const PAGE_SIZE = 20;

export const ASSIGNEE_OPTIONS: { value: AssigneeFilter; label: string }[] = [
  { value: "ALL", label: "Everyone's" },
  { value: "me", label: "Mine" },
  { value: "none", label: "Unassigned" },
];

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  ...STATUS_OPTIONS,
];

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Reads the view from the URL; anything not understood is the default. */
export function parseQueueFilter(params: {
  get(name: string): string | null;
}): QueueFilter {
  const status = params.get("status");
  const assignee = params.get("assignee");
  return {
    status:
      STATUS_OPTIONS.find((option) => option.value === status)?.value ?? "ALL",
    assignee:
      ASSIGNEE_OPTIONS.find(
        (option) => option.value === assignee && option.value !== "ALL",
      )?.value ?? "ALL",
    page: parsePage(params.get("page")),
  };
}

/** The query string for a view, without "?". Defaults are left out. */
export function serialiseQueueFilter(filter: QueueFilter): string {
  const params = new URLSearchParams();
  if (filter.status !== "ALL") params.set("status", filter.status);
  if (filter.assignee !== "ALL") params.set("assignee", filter.assignee);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** The query for `GET admin/air-ambulance/requests`. */
export function queueQuery(
  filter: QueueFilter,
): Record<string, string | number | undefined> {
  return {
    status: filter.status === "ALL" ? undefined : filter.status,
    assignee: filter.assignee === "ALL" ? undefined : filter.assignee,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

export function isFiltered(filter: QueueFilter): boolean {
  return filter.status !== "ALL" || filter.assignee !== "ALL";
}
