import type { PriceType } from "@/components/shared/price-label";
import type { EmptyLegStatus } from "@/components/shared/status-badge";

/**
 * Empty-leg offer shapes, hand-written until the API's contract (W2-1) is
 * merged. Field names follow the Planned (M7) rows in docs/api/api-routes.md.
 */
// TODO(W2-1): switch to Schemas["EmptyLegOfferDto"] and friends.
export interface EmptyLegLocation {
  id: string;
  name: string;
  city?: string | null;
  iata?: string | null;
  icao?: string | null;
  /** IANA zone, so times show in the airport's own time. */
  timeZone?: string | null;
}

export interface EmptyLegOffer {
  id: string;
  reference: string;
  aircraft: { id?: string; type: string; category: string; seats: number };
  operatorName: string;
  origin: EmptyLegLocation;
  destination: EmptyLegLocation;
  departureFrom: string;
  departureTo: string;
  seatsAvailable: number;
  price: { amountMinor: number; currency: string; priceType: PriceType };
  validUntil: string;
  conditions: string;
  status: EmptyLegStatus | string;
  /** Present for a signed-in customer: whether they asked for change alerts. */
  interested?: boolean;
  /** Present on a rejected offer, for the operator. */
  reviewNote?: string | null;
}

/** The body of `POST` and `PATCH /operator/empty-legs`. */
export interface EmptyLegInput {
  aircraftId: string;
  originId: string;
  destinationId: string;
  departureFrom: string;
  departureTo: string;
  seatsAvailable: number;
  price: { amountMinor: number; currency: string };
  validUntil: string;
  conditions: string;
}
