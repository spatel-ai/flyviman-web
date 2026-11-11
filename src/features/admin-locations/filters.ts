import type { LocationType } from "@/lib/api/types";

export type TypeFilter = LocationType | "ALL";
export type ActiveFilter = "true" | "false" | "ALL";

export interface LocationFilter {
  type: TypeFilter;
  isActive: ActiveFilter;
  q: string;
  page: number;
}

export const PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 100;

export const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "AIRPORT", label: "Airports" },
  { value: "HELIPORT", label: "Heliports" },
  { value: "LANDING_SITE", label: "Landing sites" },
  { value: "CITY", label: "Cities" },
];

export const ACTIVE_TABS: { value: ActiveFilter; label: string }[] = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
  { value: "ALL", label: "Any status" },
];

function isTypeFilter(value: string | null): value is TypeFilter {
  return TYPE_TABS.some((tab) => tab.value === value);
}

function isActiveFilter(value: string | null): value is ActiveFilter {
  return ACTIVE_TABS.some((tab) => tab.value === value);
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Reads the view from the URL. Unknown values fall back to the defaults. */
export function parseLocationFilter(params: {
  get(name: string): string | null;
}): LocationFilter {
  const type = params.get("type");
  const isActive = params.get("isActive");
  return {
    type: isTypeFilter(type) ? type : "ALL",
    isActive: isActiveFilter(isActive) ? isActive : "true",
    q: (params.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH),
    page: parsePage(params.get("page")),
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialiseLocationFilter(filter: LocationFilter): string {
  const params = new URLSearchParams();
  if (filter.type !== "ALL") params.set("type", filter.type);
  if (filter.isActive !== "true") params.set("isActive", filter.isActive);
  const q = filter.q.trim().slice(0, SEARCH_MAX_LENGTH);
  if (q) params.set("q", q);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** The query for `GET admin/locations`. */
export function locationListQuery(
  filter: LocationFilter,
): Record<string, string | number | undefined> {
  return {
    type: filter.type === "ALL" ? undefined : filter.type,
    isActive: filter.isActive === "ALL" ? undefined : filter.isActive,
    q: filter.q || undefined,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

export function emptyTitle(filter: LocationFilter): string {
  if (filter.q) return "No locations match your search";
  if (filter.isActive === "false") return "No inactive locations";
  return "No locations yet";
}
