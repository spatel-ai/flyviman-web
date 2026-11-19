// TODO(W2-2): switch to Schemas[...] once the scheduled-search contract is
// merged and `npm run api:types` has been run. Shapes follow the fixed
// contract of POST /search/scheduled (docs/api/api-routes.md, M6).

export type Cabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS";

export interface ScheduledLocation {
  id?: string;
  name?: string;
  city?: string;
  code?: string | null;
  iataCode?: string | null;
  timeZone?: string;
}

export interface ScheduledSegment {
  from: ScheduledLocation;
  to: ScheduledLocation;
  departAt: string;
  arriveAt: string;
  flightNumber: string;
  durationMinutes: number;
}

export interface ScheduledOffer {
  offerId: string;
  carrier: { code: string; name: string };
  segments: ScheduledSegment[];
  direction: "OUTBOUND" | "RETURN";
  stops: number;
  fare: {
    amountMinor: number;
    currency: string;
    priceType: "LIVE_FARE";
    fareFamily: string;
  };
  baggage: { cabinKg: number; checkedKg: number };
  refundable: boolean;
  validUntil: string;
}

export interface ScheduledSearchResponse {
  searchId: string;
  partial: boolean;
  providers: { name: string; status: "OK" | "TIMEOUT" | "ERROR" }[];
  results: ScheduledOffer[];
}

export interface ScheduledSearchBody {
  originId: string;
  destinationId: string;
  departureDate: string;
  returnDate?: string;
  passengers: { adults: number; children: number; infants: number };
  cabin: Cabin;
}

export interface FareRules {
  offerId: string;
  rules: { title: string; text: string }[];
  cancellation: { refundable: boolean; feeMinor?: number };
  change: { allowed: boolean; feeMinor?: number };
}

export interface RevalidateResult {
  status: "AVAILABLE" | "PRICE_CHANGED" | "SOLD_OUT";
  fare?: ScheduledOffer["fare"];
  validUntil?: string;
}
