import type { Schemas } from "@/lib/api/types";

type OnBooking = Schemas["BookingPassengerDto"];
type Saved = Schemas["PassengerResponseDto"];

const key = (p: {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
}) =>
  [p.firstName, p.lastName, p.dateOfBirth ?? ""]
    .map((part) => part.trim().toLowerCase())
    .join("|");

/**
 * The saved passengers who are on the booking now, found by name and date
 * of birth (the booking keeps a copy, not a link). A copy that matches no
 * saved passenger, or more than one, is counted as unmatched and left for
 * the customer to choose.
 */
export function matchSavedPassengers(
  current: readonly OnBooking[],
  saved: readonly Saved[],
): { ids: string[]; unmatched: number } {
  const ids: string[] = [];
  let unmatched = 0;
  for (const passenger of current) {
    const found = saved.filter(
      (candidate) =>
        key(candidate) === key(passenger) && !ids.includes(candidate.id),
    );
    if (found.length === 1) ids.push(found[0].id);
    else unmatched += 1;
  }
  return { ids, unmatched };
}
