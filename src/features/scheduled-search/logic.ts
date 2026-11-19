import { utcToLocal } from "@/lib/format/zoned";
import type {
  Cabin,
  ScheduledLocation,
  ScheduledOffer,
  ScheduledSegment,
} from "./types";

export const DEFAULT_ZONE = "Asia/Kolkata";

export type Sort = "price" | "departure" | "duration";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface Filters {
  /** 0, 1, 2 (2 means 2 or more). Empty: any. */
  stops: number[];
  carriers: string[];
  times: TimeOfDay[];
}

export const NO_FILTERS: Filters = { stops: [], carriers: [], times: [] };

export const TIMES_OF_DAY: { value: TimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning (6 am to noon)" },
  { value: "afternoon", label: "Afternoon (noon to 6 pm)" },
  { value: "evening", label: "Evening (6 pm to midnight)" },
  { value: "night", label: "Night (midnight to 6 am)" },
];

export const CABINS: { value: Cabin; label: string }[] = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium economy" },
  { value: "BUSINESS", label: "Business" },
];

const SORTS: Sort[] = ["price", "departure", "duration"];

export function zoneOf(segment: ScheduledSegment, end: "from" | "to") {
  return segment[end].timeZone || DEFAULT_ZONE;
}

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18) return "evening";
  return "night";
}

/** The local wall-clock hour the journey leaves. */
function departureHour(offer: ScheduledOffer): number {
  const first = offer.segments[0];
  return Number(
    utcToLocal(first.departAt, zoneOf(first, "from")).time.slice(0, 2),
  );
}

/** Door to door: first departure to last arrival, so layovers count. */
export function totalMinutes(offer: ScheduledOffer): number {
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  const span = Math.round(
    (Date.parse(last.arriveAt) - Date.parse(first.departAt)) / 60_000,
  );
  return Number.isFinite(span) && span > 0
    ? span
    : offer.segments.reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function sortOffers(
  offers: ScheduledOffer[],
  sort: Sort,
): ScheduledOffer[] {
  const key = {
    price: (o: ScheduledOffer) => o.fare.amountMinor,
    departure: (o: ScheduledOffer) => Date.parse(o.segments[0].departAt),
    duration: totalMinutes,
  }[sort];
  return [...offers].sort(
    (a, b) => key(a) - key(b) || a.fare.amountMinor - b.fare.amountMinor,
  );
}

export function applyFilters(
  offers: ScheduledOffer[],
  filters: Filters,
): ScheduledOffer[] {
  return offers.filter(
    (offer) =>
      (filters.stops.length === 0 ||
        filters.stops.includes(Math.min(offer.stops, 2))) &&
      (filters.carriers.length === 0 ||
        filters.carriers.includes(offer.carrier.code)) &&
      (filters.times.length === 0 ||
        filters.times.includes(timeOfDay(departureHour(offer)))),
  );
}

/** The carriers present, for the filter, cheapest first. */
export function carriersOf(
  offers: ScheduledOffer[],
): { code: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const offer of offers) seen.set(offer.carrier.code, offer.carrier.name);
  return [...seen].map(([code, name]) => ({ code, name }));
}

/** A fare is only good until `validUntil`; `now` is epoch ms (0: not known yet). */
export function isExpired(
  offer: { validUntil?: string },
  now: number,
): boolean {
  if (!offer.validUntil || now === 0) return false;
  const until = Date.parse(offer.validUntil);
  return Number.isFinite(until) && until <= now;
}

export function readFilters(params: URLSearchParams): {
  filters: Filters;
  sort: Sort;
} {
  const sort = params.get("sort") as Sort;
  return {
    sort: SORTS.includes(sort) ? sort : "price",
    filters: {
      stops: params
        .getAll("stops")
        .map(Number)
        .filter((n) => n === 0 || n === 1 || n === 2),
      carriers: params.getAll("carrier"),
      times: params
        .getAll("time")
        .filter((t): t is TimeOfDay => TIMES_OF_DAY.some((x) => x.value === t)),
    },
  };
}

export function writeFilters(filters: Filters, sort: Sort): string {
  const params = new URLSearchParams();
  for (const s of filters.stops) params.append("stops", String(s));
  for (const c of filters.carriers) params.append("carrier", c);
  for (const t of filters.times) params.append("time", t);
  if (sort !== "price") params.set("sort", sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function stopsLabel(stops: number): string {
  return stops === 0 ? "Non-stop" : `${stops} stop${stops === 1 ? "" : "s"}`;
}

export function travellersLabel(p: {
  adults: number;
  children: number;
  infants: number;
}): string {
  const parts = [`${p.adults} adult${p.adults === 1 ? "" : "s"}`];
  if (p.children)
    parts.push(`${p.children} child${p.children === 1 ? "" : "ren"}`);
  if (p.infants) parts.push(`${p.infants} infant${p.infants === 1 ? "" : "s"}`);
  return parts.join(", ");
}

/** "08:05" in the airport's own zone, and "+1" when it lands on a later day. */
export function clock(iso: string, zone: string): string {
  return utcToLocal(iso, zone).time;
}

export function dayOffset(
  departAt: string,
  arriveAt: string,
  dep: string,
  arr: string,
): number {
  const a = Date.parse(`${utcToLocal(departAt, dep).date}T00:00:00Z`);
  const b = Date.parse(`${utcToLocal(arriveAt, arr).date}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function placeCode(place: ScheduledLocation): string {
  return place.iata ?? place.icao ?? place.name;
}

export function placeName(place: ScheduledLocation): string {
  return place.name;
}

/** The enquiry that stands in for booking until wave 3 (business rules 1, 4). */
export function enquiryHref(offer: ScheduledOffer, searchId: string): string {
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  const message =
    `I would like help booking ${offer.carrier.name} ${offer.segments.map((s) => s.flightNumber).join(", ")} ` +
    `from ${placeName(first.from)} to ${placeName(last.to)} departing ${first.departAt}. ` +
    `Search reference ${searchId}.`;
  const params = new URLSearchParams({ topic: "PRIVATE_CHARTER", message });
  return `/contact?${params.toString()}#enquiry`;
}

/** "Total for 2 travellers": the fare is for the whole party, infants included. */
export function totalLabel(travellers: number): string {
  return travellers >= 1
    ? `Total for ${travellers} traveller${travellers === 1 ? "" : "s"}`
    : "Total for all travellers";
}
