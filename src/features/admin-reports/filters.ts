import type { Role } from "@/lib/api/types";

export const REPORT_NAMES = [
  "overview",
  "search",
  "bookings",
  "revenue",
  "payments",
  "operators",
  "empty-legs",
  "air-ambulance",
] as const;
export type ReportName = (typeof REPORT_NAMES)[number];

type Filter = "category" | "operatorId";

const OPS: Role[] = ["OPS", "SUPER_ADMIN"];
const FIN: Role[] = ["FINANCE_ADMIN", "SUPER_ADMIN"];
const ALL: Role[] = ["OPS", "FINANCE_ADMIN", "SUPER_ADMIN"];

/** Mirrors the API's role and filter table; the API still decides. */
export const REPORTS: Record<
  ReportName,
  { label: string; roles: Role[]; filters: Filter[] }
> = {
  overview: { label: "Overview", roles: ALL, filters: [] },
  search: { label: "Search", roles: OPS, filters: ["category"] },
  bookings: {
    label: "Bookings",
    roles: ALL,
    filters: ["category", "operatorId"],
  },
  revenue: {
    label: "Revenue",
    roles: FIN,
    filters: ["category", "operatorId"],
  },
  payments: { label: "Payments", roles: FIN, filters: [] },
  operators: { label: "Operators", roles: OPS, filters: ["operatorId"] },
  "empty-legs": { label: "Empty legs", roles: OPS, filters: ["operatorId"] },
  "air-ambulance": { label: "Air ambulance", roles: OPS, filters: [] },
};

export const MAX_DAYS = 366;
const DAY_MS = 86_400_000;

export interface ReportFilter {
  report: ReportName;
  from: string;
  to: string;
  category: string;
  operatorId: string;
}

/** Today in India as YYYY-MM-DD. */
export function indiaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** The last 30 days in India, today included (the API's default). */
export function defaultPeriod(now = new Date()): { from: string; to: string } {
  const to = indiaToday(now);
  return { from: addDays(to, -29), to };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function validDay(value: string | null): value is string {
  return (
    !!value &&
    DAY.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

export function parseReportFilter(
  params: { get(name: string): string | null },
  role: Role,
): ReportFilter {
  const asked = params.get("report");
  const allowed = REPORT_NAMES.filter((name) =>
    REPORTS[name].roles.includes(role),
  );
  const report =
    allowed.find((name) => name === asked) ?? allowed[0] ?? "overview";
  const fallback = defaultPeriod();
  const from = params.get("from");
  const to = params.get("to");
  const filters = REPORTS[report].filters;
  return {
    report,
    from: validDay(from) ? from : fallback.from,
    to: validDay(to) ? to : fallback.to,
    category:
      filters.includes("category") && params.get("category")
        ? (params.get("category") as string)
        : "",
    operatorId:
      filters.includes("operatorId") && params.get("operatorId")
        ? (params.get("operatorId") as string)
        : "",
  };
}

/** The period's problem in words, or null when it can be asked for. */
export function periodError(from: string, to: string): string | null {
  if (!validDay(from) || !validDay(to)) return "Enter both dates.";
  if (from > to) return "The start date must not be after the end date.";
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
  if (days > MAX_DAYS) return `Choose at most ${MAX_DAYS} days.`;
  return null;
}

/** The query the report and its CSV export both take. */
export function reportQuery(
  filter: ReportFilter,
): Record<string, string | undefined> {
  return {
    from: filter.from,
    to: filter.to,
    category: filter.category || undefined,
    operatorId: filter.operatorId || undefined,
  };
}

export function serialiseReportFilter(filter: ReportFilter): string {
  const params = new URLSearchParams({ report: filter.report });
  for (const [key, value] of Object.entries(reportQuery(filter))) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function humanise(value: string): string {
  const text = value.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A share from 0 to 1 as a percentage; "—" when there was nothing to divide by. */
export function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}
