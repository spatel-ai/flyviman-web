import type { Schemas } from "@/lib/api/types";

type Address = Schemas["AddressDto"];

const DOCUMENT_TYPES: Record<Schemas["OperatorDocumentType"], string> = {
  AOC: "Air operator certificate",
  INSURANCE: "Insurance certificate",
  REGISTRATION: "Company registration",
  OTHER: "Other",
};

const SERVICES: Record<Schemas["ServiceCategory"], string> = {
  SCHEDULED_AIRLINE: "Scheduled airline",
  PRIVATE_CHARTER: "Private charter",
  HELICOPTER: "Helicopter",
  EMPTY_LEG: "Empty legs",
  AIR_AMBULANCE: "Air ambulance",
};

const MISSING: Record<string, string> = {
  registrationNumber: "Registration number",
  businessAddress: "Business address",
  serviceCategories: "At least one service",
};

function known(map: Record<string, string>, key: string): string | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

export function documentTypeLabel(type: string): string {
  return known(DOCUMENT_TYPES, type) ?? type;
}

export function serviceLabel(category: string): string {
  return known(SERVICES, category) ?? category;
}

/** Wording for an entry of the API's `missing` list, such as `document:AOC`. */
export function missingLabel(item: string): string {
  if (item.startsWith("document:")) {
    return documentTypeLabel(item.slice("document:".length));
  }
  return known(MISSING, item) ?? item;
}

export function formatAddress(address: Address | null): string | null {
  if (!address) return null;
  return [
    address.line1,
    address.line2,
    address.city,
    `${address.state} ${address.postalCode}`.trim(),
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/** A calendar date ("12 Nov 2026"), for values that carry no time of day. */
export function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
