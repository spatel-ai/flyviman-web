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

/**
 * Why search would not offer an aircraft, in words (the API's
 * `searchBlockers`, M3 step 8).
 */
export function searchBlockerLabel(code: string): string {
  if (code.startsWith("document:")) {
    return `${aircraftDocumentLabel(code.slice("document:".length))} is missing, not accepted or has expired`;
  }
  switch (code) {
    case "listingNotApproved":
      return "The listing is not approved";
    case "operatorNotApproved":
      return "Your organisation is not approved at the moment";
    case "notAvailable":
      return "The aircraft is marked unavailable or in maintenance";
    case "homeBaseId":
      return "No home base is set";
    case "rangeKm":
      return "No range is set";
    default:
      return code;
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  TURBOPROP: "Turboprop",
  LIGHT_JET: "Light jet",
  MIDSIZE_JET: "Midsize jet",
  HEAVY_JET: "Heavy jet",
  HELICOPTER: "Helicopter",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** "1 h 05 min", "45 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return `${hours} h ${String(rest).padStart(2, "0")} min`;
}
