import { formatDateTime } from "@/lib/format/date";
import { categoryLabel } from "@/features/search/format";
import type { EmptyLegLocation, EmptyLegOffer } from "./types";

const DEFAULT_ZONE = "Asia/Kolkata";

/** "Mumbai (BOM)", falling back to the name. */
export function placeLabel(location: EmptyLegLocation): string {
  const code = location.iata ?? location.icao;
  const place = location.city ?? location.name;
  return code ? `${place} (${code})` : place;
}

export function routeLabel(offer: EmptyLegOffer): string {
  return `${placeLabel(offer.origin)} to ${placeLabel(offer.destination)}`;
}

/** The departure window in the origin's local time, zone shown. */
export function windowLabel(offer: EmptyLegOffer): string {
  const zone = offer.origin.timeZone ?? DEFAULT_ZONE;
  return `${formatDateTime(offer.departureFrom, zone)} to ${formatDateTime(offer.departureTo, zone)}`;
}

export function validUntilLabel(offer: EmptyLegOffer): string {
  return `Until ${formatDateTime(offer.validUntil, offer.origin.timeZone ?? DEFAULT_ZONE)}`;
}

export function aircraftLabel(offer: EmptyLegOffer): string {
  return `${offer.aircraft.type} · ${categoryLabel(offer.aircraft.category)}`;
}

/** An offer's validity has passed; the API also says so through its status. */
export function isLapsed(offer: EmptyLegOffer, now = Date.now()): boolean {
  return new Date(offer.validUntil).getTime() <= now;
}

/**
 * The contact page with the offer written into the message. Until booking
 * (wave 3) this is an enquiry, never a booking (business rules 2 and 3).
 */
export function enquiryHref(offer: EmptyLegOffer): string {
  const message =
    `I am interested in the empty-leg offer ${offer.reference}: ${routeLabel(offer)}, ` +
    `${offer.aircraft.type} (${offer.operatorName}), departing between ${windowLabel(offer)}. ` +
    `Please tell me whether seats are still available and the current price.`;
  const params = new URLSearchParams({ topic: "PRIVATE_CHARTER", message });
  return `/contact?${params.toString()}#enquiry`;
}
