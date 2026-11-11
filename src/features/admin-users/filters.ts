import type { Role, UserStatus } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/auth/roles";

export type RoleFilter = Role | "ALL";
export type UserStatusFilter = UserStatus | "ALL";

export interface UserFilter {
  role: RoleFilter;
  status: UserStatusFilter;
  /** Part of an email address or phone number; empty when not searching. */
  q: string;
  page: number;
}

export const PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 100;

const ROLES = Object.keys(ROLE_LABELS) as Role[];

// Wording matches StatusBadge kind="user".
const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  PENDING_VERIFICATION: "Verification pending",
  SUSPENDED: "Suspended",
};
const STATUSES = Object.keys(STATUS_LABELS) as UserStatus[];

export const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "All roles" },
  ...ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
];

export const STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  ...STATUSES.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  })),
];

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Reads the view from the URL. Anything not understood falls back to the default. */
export function parseUserFilter(params: {
  get(name: string): string | null;
}): UserFilter {
  const role = params.get("role");
  const status = params.get("status");
  return {
    role: ROLES.find((known) => known === role) ?? "ALL",
    status: STATUSES.find((known) => known === status) ?? "ALL",
    q: (params.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH),
    page: parsePage(params.get("page")),
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialiseUserFilter(filter: UserFilter): string {
  const params = new URLSearchParams();
  if (filter.role !== "ALL") params.set("role", filter.role);
  if (filter.status !== "ALL") params.set("status", filter.status);
  const q = filter.q.trim().slice(0, SEARCH_MAX_LENGTH);
  if (q) params.set("q", q);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** The query for `GET admin/users`. */
export function userListQuery(
  filter: UserFilter,
): Record<string, string | number | undefined> {
  return {
    role: filter.role === "ALL" ? undefined : filter.role,
    status: filter.status === "ALL" ? undefined : filter.status,
    q: filter.q || undefined,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

export function isFiltered(filter: UserFilter): boolean {
  return filter.role !== "ALL" || filter.status !== "ALL" || filter.q !== "";
}
