import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";

type Detail = Schemas["SearchResultDetailDto"];

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

/** Our licensed photograph for each aircraft class (aircraft photos are private). */
export const CATEGORY_IMAGES = {
  TURBOPROP: "charter",
  LIGHT_JET: "jetNose",
  MIDSIZE_JET: "cabinTan",
  HEAVY_JET: "charterJetDusk",
  HELICOPTER: "helicopter",
} as const;

export function categoryImage(category: string) {
  return CATEGORY_IMAGES[category as keyof typeof CATEGORY_IMAGES] ?? "charter";
}
