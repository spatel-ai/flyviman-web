export const KINDS = [
  { value: "ALL", label: "All" },
  { value: "OPERATOR", label: "Operators" },
  { value: "AIRCRAFT", label: "Aircraft" },
] as const;
export type KindFilter = (typeof KINDS)[number]["value"];

export const WINDOWS = [
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 90 days" },
] as const;

export interface ExpiringFilter {
  kind: KindFilter;
  withinDays: 7 | 30 | 90;
  page: number;
}

/** The view lives in the address, so it can be shared and returned to. */
export function parseExpiringFilter(params: URLSearchParams): ExpiringFilter {
  const kind = params.get("kind");
  const within = Number(params.get("within"));
  return {
    kind: kind === "OPERATOR" || kind === "AIRCRAFT" ? kind : "ALL",
    withinDays: within === 7 || within === 90 ? within : 30,
    page: Math.max(1, Math.floor(Number(params.get("page"))) || 1),
  };
}

export function serialiseExpiringFilter(filter: ExpiringFilter): string {
  const params = new URLSearchParams();
  if (filter.kind !== "ALL") params.set("kind", filter.kind);
  if (filter.withinDays !== 30) params.set("within", String(filter.withinDays));
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

const OPERATOR_LABELS: Record<string, string> = {
  AOC: "Air operator certificate",
  INSURANCE: "Insurance",
  REGISTRATION: "Company registration",
  OTHER: "Other document",
};

export function operatorDocumentLabel(type: string): string {
  return OPERATOR_LABELS[type] ?? type;
}
