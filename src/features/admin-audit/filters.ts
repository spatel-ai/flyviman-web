export interface AuditFilter {
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  /** A calendar day, `YYYY-MM-DD`, in Indian time (the zone the page shows). */
  from: string;
  to: string;
  page: number;
}

export const PAGE_SIZE = 20;

export const EMPTY_FILTER: AuditFilter = {
  action: "",
  entityType: "",
  entityId: "",
  actorId: "",
  from: "",
  to: "",
  page: 1,
};

const TEXT_KEYS = ["action", "entityType", "entityId"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function parseDay(value: string | null): string {
  if (!value || !DAY.test(value)) return "";
  return Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) ? "" : value;
}

function parseText(value: string | null): string {
  return (value ?? "").trim().slice(0, 100);
}

/** Reads the view from the URL. Anything not understood falls back to the default. */
export function parseAuditFilter(params: {
  get(name: string): string | null;
}): AuditFilter {
  const actorId = (params.get("actorId") ?? "").trim();
  return {
    action: parseText(params.get("action")),
    entityType: parseText(params.get("entityType")),
    entityId: parseText(params.get("entityId")),
    actorId: UUID.test(actorId) ? actorId : "",
    from: parseDay(params.get("from")),
    to: parseDay(params.get("to")),
    page: parsePage(params.get("page")),
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialiseAuditFilter(filter: AuditFilter): string {
  const params = new URLSearchParams();
  for (const key of TEXT_KEYS) if (filter[key]) params.set(key, filter[key]);
  if (filter.actorId) params.set("actorId", filter.actorId);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

export function isFiltered(filter: AuditFilter): boolean {
  return serialiseAuditFilter({ ...filter, page: 1 }) !== "";
}

/** The start of an Indian calendar day, as a UTC instant. */
function dayStart(day: string): string {
  return new Date(`${day}T00:00:00+05:30`).toISOString();
}

/** The last moment of an Indian calendar day, as a UTC instant. */
function dayEnd(day: string): string {
  return new Date(`${day}T23:59:59.999+05:30`).toISOString();
}

/** The query for `GET admin/audit-logs`. */
export function auditListQuery(
  filter: AuditFilter,
): Record<string, string | number | undefined> {
  return {
    action: filter.action || undefined,
    entityType: filter.entityType || undefined,
    entityId: filter.entityId || undefined,
    actorId: filter.actorId || undefined,
    from: filter.from ? dayStart(filter.from) : undefined,
    to: filter.to ? dayEnd(filter.to) : undefined,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}
