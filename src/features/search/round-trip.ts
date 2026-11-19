/**
 * Round-trip fields of a search result. Hand-written until the API's contract
 * for round trips is merged.
 * TODO(W1-6): switch to Schemas[...]
 */
export type TripType = "ONE_WAY" | "ROUND_TRIP";
export type RoundTripStrategy = "WAIT" | "RETURN_TO_BASE";

export interface RoundTripFields {
  tripType?: TripType;
  returnAt?: string | null;
  roundTripStrategy?: RoundTripStrategy | null;
}

const STRATEGY_WORDS: Record<RoundTripStrategy, string> = {
  WAIT: "Aircraft waits at destination",
  RETURN_TO_BASE: "Returns to base between flights",
};

/** The strategy in plain words; null for a one-way result or an unknown value. */
export function strategyLabel(
  strategy: RoundTripStrategy | null | undefined,
): string | null {
  return strategy ? (STRATEGY_WORDS[strategy] ?? null) : null;
}

export function isRoundTrip(fields: RoundTripFields): boolean {
  return fields.tripType === "ROUND_TRIP";
}

/** A new return instant that keeps the stay when the departure moves. */
export function shiftReturn(
  oldDepartureAt: string,
  oldReturnAt: string,
  newDepartureAt: string,
): string {
  const stay =
    new Date(oldReturnAt).getTime() - new Date(oldDepartureAt).getTime();
  return new Date(new Date(newDepartureAt).getTime() + stay).toISOString();
}
