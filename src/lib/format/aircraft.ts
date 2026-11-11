/** Readable names for aircraft document types and profile gaps, shared by both portals. */
export const AIRCRAFT_DOCUMENT_LABELS: Record<string, string> = {
  REGISTRATION: "Certificate of registration",
  AIRWORTHINESS: "Certificate of airworthiness",
  INSURANCE: "Insurance",
};

const FIELD_LABELS: Record<string, string> = {
  homeBaseId: "Home base",
  rangeKm: "Range",
};

export function aircraftDocumentLabel(type: string): string {
  return AIRCRAFT_DOCUMENT_LABELS[type] ?? type;
}

/**
 * Names what an aircraft still needs before submit, from the API's codes
 * ("rangeKm", "document:INSURANCE").
 */
export function missingLabel(code: string): string {
  if (code.startsWith("document:")) {
    return `${aircraftDocumentLabel(code.slice("document:".length))} (current, not expired)`;
  }
  return FIELD_LABELS[code] ?? code;
}

/** A date-only value ("2030-12-31") as "31 Dec 2030", without shifting the day. */
export function formatDay(day: string): string {
  const date = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
