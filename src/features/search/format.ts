import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";

type Detail = Schemas["SearchResultDetailDto"];

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

/**
 * The contact page, with the topic chosen and a message describing this
 * aircraft and trip. Nothing is booked: it is an enquiry (business rule 4).
 */
export function requestHref(detail: Detail): string {
  const leg = detail.legs[0];
  const price = detail.price
    ? ` The estimate shown was ${formatMoney(detail.price.amountMinor, detail.price.currency)}.`
    : "";
  const message =
    `I would like to request the ${detail.aircraft.manufacturer} ${detail.aircraft.model} ` +
    `(${detail.operatorName}) from ${leg.originName} to ${leg.destinationName} ` +
    `on ${formatDateTime(leg.departureAt)} for ${detail.passengerCount} ` +
    `passenger${detail.passengerCount === 1 ? "" : "s"}.${price} ` +
    `Search reference ${detail.searchId}.`;
  // There is no helicopter topic; the message names the aircraft.
  const params = new URLSearchParams({ topic: "PRIVATE_CHARTER", message });
  return `/contact?${params.toString()}#enquiry`;
}
